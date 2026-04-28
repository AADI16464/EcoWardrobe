/**
 * ML Service Connector — EcoWardrobe
 *
 * Calls the Python FastAPI ML service at http://localhost:8000/predict.
 * If the ML service is unavailable or returns an error, the function
 * falls back to the rule-based logic defined in utils/aiLogic.js so the
 * platform always returns a valid prediction.
 *
 * Payload shape sent to ML API:
 *   { category, condition_score, base_price, age, brand }
 *
 * Expected ML response shape:
 *   {
 *     predicted_price:   number,
 *     repair_cost:       number,
 *     sell_probability:  number,   // 0–1
 *     decision:          string,   // 'resell' | 'refurbish' | 'donate'
 *     impact: {
 *       co2_saved:       number,
 *       beneficiaries:   number,
 *     }
 *   }
 */

const axios = require('axios');
const { analyzeItem } = require('../utils/aiLogic');

const ML_API_URL      = process.env.ML_API_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS   = parseInt(process.env.ML_TIMEOUT_MS || '5000', 10);

// ─── Rule-based fallback ─────────────────────────────────────────────────────

/**
 * Converts the output of analyzeItem() into the same shape the ML API returns.
 * Used when the ML service is unavailable.
 *
 * @param {object} aiResult  - Result from analyzeItem()
 * @param {number} conditionScore
 * @returns {MLPrediction}
 */
function buildFallbackPrediction(aiResult, conditionScore) {
  // Estimate sell probability from condition score
  const sell_probability =
    conditionScore > 0.7 ? Math.round((0.7 + conditionScore * 0.3) * 100) / 100
    : conditionScore > 0.4 ? Math.round((0.3 + conditionScore * 0.5) * 100) / 100
    : Math.round(conditionScore * 0.3 * 100) / 100;

  // Rough repair cost estimate (10–30% of base_price for refurbish items)
  const repair_cost =
    aiResult.decision === 'refurbish'
      ? Math.round(aiResult.base_price * 0.2)
      : 0;

  return {
    predicted_price:  aiResult.price,
    repair_cost,
    sell_probability,
    decision:         aiResult.decision,
    impact: {
      co2_saved:      aiResult.co2_saved,
      beneficiaries:  aiResult.beneficiaries,
    },
    _source: 'fallback', // diagnostic flag
  };
}

// ─── Main exported function ───────────────────────────────────────────────────

/**
 * Get an ML prediction for a clothing/goods item.
 *
 * @param {{
 *   category:        string,
 *   condition_score: number,
 *   base_price:      number,
 *   age:             number,
 *   brand:           string,
 * }} data
 *
 * @returns {Promise<{
 *   predicted_price:  number,
 *   repair_cost:      number,
 *   sell_probability: number,
 *   decision:         string,
 *   impact: { co2_saved: number, beneficiaries: number },
 *   _source:          string,
 * }>}
 */
async function getPrediction(data) {
  const { category, condition_score, base_price, age, brand } = data;

  const payload = {
    category:        category || 'other',
    condition_score: parseFloat(condition_score) || 0,
    base_price:      parseFloat(base_price)      || 0,
    age:             parseFloat(age)             || 0,
    brand:           brand                       || '',
  };

  // ── Try ML API ─────────────────────────────────────────────────────────────
  try {
    console.log(`[ML] Calling ${ML_API_URL}/predict with payload:`, payload);

    const response = await axios.post(`${ML_API_URL}/predict`, payload, {
      timeout: ML_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });

    const mlData = response.data;

    // Validate critical fields
    if (
      mlData &&
      typeof mlData.predicted_price  !== 'undefined' &&
      typeof mlData.decision         !== 'undefined'
    ) {
      console.log(`[ML] Success — decision=${mlData.decision} price=${mlData.predicted_price}`);
      return {
        predicted_price:  Number(mlData.predicted_price)  || 0,
        repair_cost:      Number(mlData.repair_cost)       || 0,
        sell_probability: Number(mlData.sell_probability)  || 0,
        decision:         mlData.decision,
        impact: {
          co2_saved:     Number(mlData.impact?.co2_saved)     || 0,
          beneficiaries: Number(mlData.impact?.beneficiaries) || 0,
        },
        _source: 'ml_api',
      };
    }

    // Unexpected response shape — fall through to fallback
    throw new Error(`Unexpected ML response shape: ${JSON.stringify(mlData)}`);

  } catch (err) {
    // ── Fallback ───────────────────────────────────────────────────────────
    const isNetworkError =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ECONNRESET'   ||
      err.code === 'ETIMEDOUT'    ||
      err.message?.includes('timeout');

    if (isNetworkError) {
      console.warn(`[ML] Service unavailable (${err.code || 'timeout'}) — using rule-based fallback`);
    } else {
      console.error(`[ML] Error — ${err.message} — using rule-based fallback`);
    }

    // Rule-based fallback via existing aiLogic utility
    const aiResult = analyzeItem({ category, condition_score });
    return buildFallbackPrediction(aiResult, condition_score);
  }
}

module.exports = { getPrediction };
