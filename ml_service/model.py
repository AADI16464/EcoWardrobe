"""
model.py — EcoWardrobe ML Service
===================================
XGBoost-based prediction models for:
  1. predicted_price       (XGBRegressor)
  2. sell_probability      (XGBClassifier → predict_proba)
  3. repair_cost           (XGBRegressor, only for refurbish items)

All models are trained on synthetic data derived from domain knowledge
(BASE_PRICES, CO2_SAVINGS, brand multipliers) at server startup.
Synthetic data intentionally mirrors real-world patterns so the model
generalises well despite no labelled dataset.

Public API (used by main.py):
    load_models()  →  must be called once on startup
    predict(...)   →  returns PredictionResult dataclass
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from typing import Optional

import numpy as np
from xgboost import XGBClassifier, XGBRegressor

from utils import (
    BASE_PRICES,
    CATEGORY_INDEX,
    VALID_CATEGORIES,
    build_feature_vector,
    get_beneficiaries,
    get_brand_multiplier,
    get_co2_saved,
    get_decision,
    normalize_category,
)

log = logging.getLogger("ecowardrobe.model")

# ── Dataclass returned by predict() ──────────────────────────────────────────

@dataclass
class PredictionResult:
    predicted_price:  float
    repair_cost:      float
    sell_probability: float
    decision:         str
    impact: dict          # {"co2_saved": float, "beneficiaries": int}
    source:           str  # "xgboost" always from this module


# ── Singleton model store ─────────────────────────────────────────────────────

_price_model:    Optional[XGBRegressor]  = None
_sell_model:     Optional[XGBClassifier] = None
_repair_model:   Optional[XGBRegressor]  = None
_models_loaded:  bool                    = False


# ── Synthetic Training Data Generator ────────────────────────────────────────

def _generate_training_data(n_samples: int = 3000) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate realistic synthetic training samples.

    Returns:
        X           — (n, 9) feature matrix
        y_price     — (n,)   target: predicted resale price (INR)
        y_sell      — (n,)   binary: 1 = sellable (resell/refurbish), 0 = donate
        y_repair    — (n,)   repair cost (only meaningful when decision==refurbish)
    """
    random.seed(42)
    np.random.seed(42)

    X         = []
    y_price   = []
    y_sell    = []
    y_repair  = []

    cat_list  = VALID_CATEGORIES         # 7 categories
    brand_list = [
        "", "Nike", "Adidas", "Zara", "H&M",
        "Apple", "Samsung", "Levi's", "Puma", "Gap",
        "Sony", "OnePlus", "Uniqlo",
    ]

    for _ in range(n_samples):
        # ── Sample raw inputs ────────────────────────────────────────────
        cat        = random.choice(cat_list)
        condition  = round(random.uniform(0.05, 1.0), 3)
        age        = round(random.uniform(0.0, 12.0), 1)
        brand      = random.choice(brand_list)
        base       = BASE_PRICES.get(cat, 500.0)

        brand_mult = get_brand_multiplier(brand)
        decision   = get_decision(condition)

        # ── Price model target ───────────────────────────────────────────
        # Formula mirrors domain logic + noise
        if decision == "donate":
            price = 0.0
        else:
            condition_factor = condition ** 0.75
            age_decay        = max(0.5, 1.0 - 0.05 * age)
            price            = base * condition_factor * age_decay * brand_mult
            price           += np.random.normal(0, price * 0.05)  # ±5% noise
            price            = max(0.0, price)

        # ── Sell probability target (binary) ─────────────────────────────
        # 1 = can be sold (resell/refurbish), 0 = donate
        sell_label = 0 if decision == "donate" else 1

        # ── Repair cost target ───────────────────────────────────────────
        if decision == "refurbish":
            repair_pct  = 0.35 - (condition * 0.20)
            repair      = base * repair_pct + np.random.normal(0, 50)
            repair      = max(0.0, repair)
        else:
            repair = 0.0

        # ── Build feature vector & store ─────────────────────────────────
        fv = build_feature_vector(cat, condition, base, age, brand)

        X.append(fv)
        y_price.append(price)
        y_sell.append(sell_label)
        y_repair.append(repair)

    return (
        np.array(X,        dtype=np.float32),
        np.array(y_price,  dtype=np.float32),
        np.array(y_sell,   dtype=np.int8),
        np.array(y_repair, dtype=np.float32),
    )


# ── Model Training ─────────────────────────────────────────────────────────

def _train_price_model(X: np.ndarray, y: np.ndarray) -> XGBRegressor:
    model = XGBRegressor(
        n_estimators      = 300,
        max_depth         = 6,
        learning_rate     = 0.08,
        subsample         = 0.85,
        colsample_bytree  = 0.85,
        reg_alpha         = 0.1,
        reg_lambda        = 1.0,
        random_state      = 42,
        verbosity         = 0,
    )
    model.fit(X, y)
    return model


def _train_sell_model(X: np.ndarray, y: np.ndarray) -> XGBClassifier:
    model = XGBClassifier(
        n_estimators     = 200,
        max_depth        = 5,
        learning_rate    = 0.10,
        subsample        = 0.80,
        colsample_bytree = 0.80,
        use_label_encoder= False,
        eval_metric      = "logloss",
        random_state     = 42,
        verbosity        = 0,
    )
    model.fit(X, y)
    return model


def _train_repair_model(X: np.ndarray, y: np.ndarray) -> XGBRegressor:
    # Train only on refurbish samples (where repair cost > 0)
    mask     = y > 0
    X_refurb = X[mask]
    y_refurb = y[mask]

    model = XGBRegressor(
        n_estimators     = 150,
        max_depth        = 4,
        learning_rate    = 0.10,
        subsample        = 0.80,
        random_state     = 42,
        verbosity        = 0,
    )
    model.fit(X_refurb, y_refurb)
    return model


# ── Public: load / train models once at startup ───────────────────────────────

def load_models() -> None:
    """Train all XGBoost models on synthetic data. Call once on startup."""
    global _price_model, _sell_model, _repair_model, _models_loaded

    if _models_loaded:
        return

    log.info("[Model] Generating synthetic training data…")
    X, y_price, y_sell, y_repair = _generate_training_data(n_samples=3000)

    log.info("[Model] Training price model…")
    _price_model  = _train_price_model(X, y_price)

    log.info("[Model] Training sell-probability model…")
    _sell_model   = _train_sell_model(X, y_sell)

    log.info("[Model] Training repair-cost model…")
    _repair_model = _train_repair_model(X, y_repair)

    _models_loaded = True
    log.info("[Model] ✅ All XGBoost models ready.")


# ── Public: predict ──────────────────────────────────────────────────────────

def predict(
    category:        str,
    condition_score: float,
    base_price:      float,
    age:             float,
    brand:           str,
) -> PredictionResult:
    """
    Run all three XGBoost models and return a PredictionResult.

    Args:
        category        — raw string from frontend (e.g. "Men", "Electronics")
        condition_score — float 0-1
        base_price      — user / category base price in INR (0 = use default)
        age             — item age in years
        brand           — brand name (empty string if unknown)

    Returns:
        PredictionResult dataclass
    """
    if not _models_loaded:
        raise RuntimeError("Models not loaded. Call load_models() first.")

    # ── Normalise inputs ─────────────────────────────────────────────────
    cat_key      = normalize_category(category)
    cond         = float(np.clip(condition_score, 0.0, 1.0))
    base         = float(base_price) if base_price > 0 else BASE_PRICES.get(cat_key, 500.0)
    age_val      = float(max(0.0, age))
    decision     = get_decision(cond)

    # ── Feature vector ───────────────────────────────────────────────────
    fv = build_feature_vector(cat_key, cond, base, age_val, brand)
    X  = fv.reshape(1, -1)

    # ── Price prediction ─────────────────────────────────────────────────
    if decision == "donate":
        predicted_price = 0.0
    else:
        raw_price       = float(_price_model.predict(X)[0])
        predicted_price = max(0.0, round(raw_price, 2))

    # ── Sell probability ─────────────────────────────────────────────────
    proba           = _sell_model.predict_proba(X)[0]   # [p_donate, p_sellable]
    sell_probability = round(float(proba[1]), 3)        # probability of being sellable

    # ── Repair cost ──────────────────────────────────────────────────────
    if decision == "refurbish":
        raw_repair  = float(_repair_model.predict(X)[0])
        repair_cost = max(0.0, round(raw_repair, 2))
    else:
        repair_cost = 0.0

    # ── Impact ───────────────────────────────────────────────────────────
    co2        = get_co2_saved(cat_key)
    benefic    = get_beneficiaries(cat_key, decision)

    return PredictionResult(
        predicted_price  = predicted_price,
        repair_cost      = repair_cost,
        sell_probability = sell_probability,
        decision         = decision,
        impact           = {"co2_saved": co2, "beneficiaries": benefic},
        source           = "xgboost",
    )
