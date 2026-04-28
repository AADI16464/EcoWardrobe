"""
utils.py — EcoWardrobe ML Service
===================================
Shared constants, feature engineering, and helper functions.
Imported by both model.py and main.py.
"""

import numpy as np

# ── Category Registry ────────────────────────────────────────────────────────

CATEGORY_ALIASES: dict[str, str] = {
    "men":         "men",   "male": "men",
    "women":       "women", "female": "women", "woman": "women",
    "kids":        "kids",  "children": "kids", "child": "kids",
    "shoes":       "shoes",
    "footwear":    "shoes",
    "electronics": "electronics", "electronic": "electronics",
    "clothing":    "men",   "clothes": "men",
    "accessories": "accessories", "accessory": "accessories",
}

VALID_CATEGORIES = ["men", "women", "kids", "shoes", "electronics", "accessories", "other"]

# Numeric index used as model feature (one consistent mapping)
CATEGORY_INDEX: dict[str, int] = {
    "men": 0, "women": 1, "kids": 2,
    "shoes": 3, "electronics": 4,
    "accessories": 5, "other": 6,
}

# ── Domain Lookup Tables ─────────────────────────────────────────────────────

BASE_PRICES: dict[str, float] = {
    "men":          1200.0,
    "women":        1500.0,
    "kids":          800.0,
    "shoes":        2000.0,
    "electronics":  5000.0,
    "accessories":   900.0,
    "other":         500.0,
}

CO2_SAVINGS: dict[str, float] = {
    "men":          4.2,
    "women":        3.8,
    "kids":         1.5,
    "shoes":        8.5,
    "electronics":  3.2,
    "accessories":  2.5,
    "other":        2.0,
}

BENEFICIARIES: dict[str, int] = {
    "men":          1,
    "women":        1,
    "kids":         2,
    "shoes":        1,
    "electronics":  3,
    "accessories":  1,
    "other":        1,
}

# ── Brand Multipliers ────────────────────────────────────────────────────────

BRAND_MULTIPLIERS: dict[str, float] = {
    # Sports
    "nike": 1.30, "adidas": 1.25, "puma": 1.15, "reebok": 1.10,
    "under armour": 1.12, "new balance": 1.10,
    # Fashion
    "zara": 1.10, "h&m": 1.00, "gap": 1.05, "uniqlo": 1.08,
    "mango": 1.08, "forever 21": 0.95,
    # Premium denim/casual
    "levi": 1.20, "levis": 1.20, "wrangler": 1.10,
    # Electronics
    "samsung": 1.20, "apple": 1.45, "sony": 1.25,
    "hp": 1.10, "dell": 1.12, "lenovo": 1.08, "asus": 1.08,
    "lg": 1.10, "oneplus": 1.15,
    # Luxury (rare but possible)
    "gucci": 2.50, "prada": 2.30, "louis vuitton": 2.80,
}

# ── Normalisation Helpers ────────────────────────────────────────────────────

def normalize_category(category: str) -> str:
    """Map raw frontend/user input to a canonical internal key."""
    raw = (category or "").strip().lower()
    return CATEGORY_ALIASES.get(raw, "other")


def get_brand_multiplier(brand: str) -> float:
    """Return the price multiplier for a known brand (default 1.0)."""
    brand_lower = (brand or "").strip().lower()
    if not brand_lower:
        return 1.0
    for key, mult in BRAND_MULTIPLIERS.items():
        if key in brand_lower:
            return mult
    return 1.0


# ── Decision Rule ─────────────────────────────────────────────────────────────

def get_decision(condition_score: float) -> str:
    """
    Threshold-based decision (also used as training label generator).
        score > 0.70  → resell
        score > 0.40  → refurbish
        else          → donate
    """
    if condition_score > 0.70:
        return "resell"
    if condition_score > 0.40:
        return "refurbish"
    return "donate"


# ── Impact Helpers ────────────────────────────────────────────────────────────

def get_co2_saved(cat_key: str) -> float:
    return CO2_SAVINGS.get(cat_key, CO2_SAVINGS["other"])


def get_beneficiaries(cat_key: str, decision: str) -> int:
    """Beneficiaries only accrue for donated items."""
    if decision != "donate":
        return 0
    return BENEFICIARIES.get(cat_key, 1)


# ── Feature Engineering ───────────────────────────────────────────────────────

def build_feature_vector(
    cat_key: str,
    condition_score: float,
    base_price: float,
    age: float,
    brand: str,
) -> np.ndarray:
    """
    Produces a fixed-length numpy feature vector for the XGBoost models.

    Features (9 total):
        [0]  condition_score          — 0-1
        [1]  age                      — years (clipped 0-30)
        [2]  base_price               — INR
        [3]  brand_multiplier         — float ≥ 1.0
        [4]  category_index           — int 0-6
        [5]  condition_sq             — condition_score²  (non-linear signal)
        [6]  age_condition_interact   — age × (1 - condition_score)
        [7]  price_condition          — base_price × condition_score
        [8]  is_electronics           — binary flag
    """
    cat_idx       = CATEGORY_INDEX.get(cat_key, 6)
    brand_mult    = get_brand_multiplier(brand)
    age_clipped   = min(float(age), 30.0)
    cond_sq       = condition_score ** 2
    age_cond_int  = age_clipped * (1.0 - condition_score)
    price_cond    = base_price * condition_score
    is_electronics = 1.0 if cat_key == "electronics" else 0.0

    return np.array([
        condition_score,
        age_clipped,
        base_price,
        brand_mult,
        float(cat_idx),
        cond_sq,
        age_cond_int,
        price_cond,
        is_electronics,
    ], dtype=np.float32)
