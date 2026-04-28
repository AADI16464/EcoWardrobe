/**
 * AI Logic for EcoWardrobe — MVP Decision Engine
 *
 * Structure is designed to be replaced with a real ML model in the future.
 * All functions are pure and independently testable.
 */

// ─── Base Prices (INR) — keyed by lowercase category ─────────────────────────
const BASE_PRICES = {
  men:         1200,
  women:       1500,
  kids:        800,
  shoes:       2000,
  electronics: 5000,
  clothing:    1200,
  accessories: 900,
  footwear:    2000,
  other:       500,
};

// ─── CO₂ Savings (kg) per item diverted from landfill ────────────────────────
const CO2_SAVINGS = {
  men:         4.2,
  women:       3.8,
  kids:        1.5,
  shoes:       8.5,
  electronics: 3.2,
  clothing:    4.0,
  accessories: 2.5,
  footwear:    8.5,
  other:       2.0,
};

// ─── Beneficiaries per donated item (estimated) ────────────────────────────────
const BENEFICIARIES = {
  men:         1,
  women:       1,
  kids:        2, // kids items often help multiple children
  shoes:       1,
  electronics: 3, // shared tech device
  clothing:    1,
  accessories: 1,
  footwear:    1,
  other:       1,
};

/**
 * Normalize category string to our internal key
 */
function normalizeCategory(category) {
  const raw = (category || '').toLowerCase().trim();
  // Map display names to keys
  const aliases = {
    'men':         'men',
    'women':       'women',
    'kids':        'kids',
    'shoes':       'shoes',
    'electronics': 'electronics',
    'clothing':    'clothing',
    'accessories': 'accessories',
    'footwear':    'footwear',
  };
  return aliases[raw] || 'other';
}

/**
 * Maps numeric condition score → human-readable label
 * @param {number} score  0–1
 */
function getConditionLabel(score) {
  if (score >= 0.85) return 'excellent';
  if (score >= 0.65) return 'good';
  if (score >= 0.40) return 'fair';
  return 'poor';
}

/**
 * AI Decision Engine
 *   score > 0.7  → resell
 *   score > 0.4  → refurbish
 *   else         → donate
 *
 * @param {number} conditionScore  0–1
 * @returns {'resell'|'refurbish'|'donate'}
 */
function getDecision(conditionScore) {
  if (conditionScore > 0.7) return 'resell';
  if (conditionScore > 0.4) return 'refurbish';
  return 'donate';
}

/**
 * Pricing Model
 *   price = base_price × condition_score
 *   Donated items are always ₹0
 *
 * @param {string} category
 * @param {number} conditionScore
 * @param {'resell'|'refurbish'|'donate'} decision
 */
function computePrice(category, conditionScore, decision) {
  if (decision === 'donate') return 0;
  const key = normalizeCategory(category);
  const base = BASE_PRICES[key] ?? BASE_PRICES.other;
  return Math.round(base * conditionScore);
}

/**
 * Impact Calculation
 *   co2_saved = category_factor (per item diverted)
 *
 * @param {string} category
 */
function estimateCO2(category) {
  const key = normalizeCategory(category);
  return CO2_SAVINGS[key] ?? CO2_SAVINGS.other;
}

/**
 * Beneficiary estimation
 * @param {string} category
 * @param {'resell'|'refurbish'|'donate'} decision
 */
function estimateBeneficiaries(category, decision) {
  if (decision !== 'donate') return 0;
  const key = normalizeCategory(category);
  return BENEFICIARIES[key] ?? 1;
}

/**
 * Full AI analysis for an uploaded item.
 * This is the main entry point called by API routes.
 *
 * @param {{ category: string, condition_score: number }} param0
 * @returns {{
 *   decision: string,
 *   condition_label: string,
 *   base_price: number,
 *   price: number,
 *   co2_saved: number,
 *   beneficiaries: number,
 *   status: string,
 * }}
 */
function analyzeItem({ category, condition_score }) {
  const score = parseFloat(condition_score);
  if (isNaN(score) || score < 0 || score > 1) {
    throw new Error(`Invalid condition_score: ${condition_score}. Must be 0–1.`);
  }

  const decision       = getDecision(score);
  const condition_label = getConditionLabel(score);
  const catKey         = normalizeCategory(category);
  const base_price     = BASE_PRICES[catKey] ?? BASE_PRICES.other;
  const price          = computePrice(category, score, decision);
  const co2_saved      = estimateCO2(category);
  const beneficiaries  = estimateBeneficiaries(category, decision);

  // Derive initial item status from decision
  const statusMap = { resell: 'listed', refurbish: 'refurbishing', donate: 'donated' };
  const status = statusMap[decision];

  console.log(`[AI] category=${category} score=${score} → decision=${decision} price=₹${price} co2=${co2_saved}kg`);

  return {
    decision,
    condition_label,
    base_price,
    price,
    co2_saved,
    beneficiaries,
    status,
  };
}

module.exports = {
  analyzeItem,
  getDecision,
  getConditionLabel,
  computePrice,
  estimateCO2,
  estimateBeneficiaries,
  normalizeCategory,
};
