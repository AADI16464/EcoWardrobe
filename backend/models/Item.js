const mongoose = require('mongoose');

/**
 * Item Model — EcoWardrobe
 *
 * IMPORTANT: category enum matches what the frontend sends (Men/Women/Kids/Shoes/Electronics).
 * These are stored as-is; the AI/ML logic normalises them to lowercase internally.
 *
 * Fields marked [ML] are populated by the Python FastAPI ML service (or fallback).
 */
const itemSchema = new mongoose.Schema(
  {
    // ── Owner ──────────────────────────────────────────────────────────────
    user_id: { type: String, required: true, index: true },

    // ── Core descriptive fields ───────────────────────────────────────────
    name:        { type: String, default: '' },       // item name / brand alias
    category: {
      type: String,
      enum: [
        'Men', 'Women', 'Kids', 'Shoes', 'Electronics', 'Other',
        'clothing', 'electronics', 'accessories', 'footwear', 'other',
      ],
      required: true,
    },
    brand:       { type: String, default: '' },
    description: { type: String, default: '' },
    age:         { type: Number, default: 0 },        // item age in years

    // ── Condition ─────────────────────────────────────────────────────────
    condition_score: { type: Number, required: true, min: 0, max: 1 },
    condition_label: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      required: true,
    },

    // ── Pricing ───────────────────────────────────────────────────────────
    base_price:      { type: Number, default: 0 },    // category baseline
    price:           { type: Number, default: 0 },    // rule-based price (kept for compat)
    predicted_price: { type: Number, default: 0 },    // [ML] ML-predicted market price
    repair_cost:     { type: Number, default: 0 },    // [ML] estimated repair/refurbish cost

    // ── ML outputs ────────────────────────────────────────────────────────
    sell_probability: { type: Number, default: 0, min: 0, max: 1 }, // [ML] 0–1
    decision: {
      type: String,
      enum: ['resell', 'refurbish', 'donate'],
      required: true,
    },
    prediction_source: {
      type: String,
      enum: ['ml_api', 'fallback'],
      default: 'fallback',
    },

    // ── Quantity & lifecycle ──────────────────────────────────────────────
    quantity: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['listed', 'sold', 'donated', 'refurbishing'],
      default: 'listed',
    },

    // ── Media ─────────────────────────────────────────────────────────────
    images: [{ type: String }],

    // ── Relations ─────────────────────────────────────────────────────────
    buyer_id:    { type: String, default: null },
    beneficiary: { type: String, default: null },

    // ── Impact (top-level shorthand for quick queries) ─────────────────────
    co2_saved: { type: Number, default: 0 },

    // ── Impact sub-document (detailed, [ML]-populated) ─────────────────────
    impact: {
      co2_saved:     { type: Number, default: 0 },
      beneficiaries: { type: Number, default: 0 },
      location:      { type: String, default: '' },
      media_url:     { type: String, default: '' },
      description:   { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
