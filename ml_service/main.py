"""
main.py — EcoWardrobe ML Service
==================================
FastAPI application that exposes the XGBoost prediction pipeline.

Endpoints:
    GET  /          — service info
    GET  /health    — health check (used by Node.js backend probe)
    POST /predict   — main prediction endpoint

Architecture:
    main.py   ←── API layer (routes, schemas, validation)
    model.py  ←── XGBoost models (price, sell_probability, repair_cost)
    utils.py  ←── shared constants, feature engineering, helpers

Run (from ml_service/ directory):
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

import model as ml
from utils import normalize_category, VALID_CATEGORIES

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt = "%H:%M:%S",
)
log = logging.getLogger("ecowardrobe.main")


# ── Lifespan: train models once at startup ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("🚀 Starting EcoWardrobe ML Service — training XGBoost models…")
    ml.load_models()
    log.info("✅ ML Service ready to serve predictions.")
    yield
    log.info("🛑 ML Service shutting down.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "EcoWardrobe ML Service",
    description = (
        "XGBoost-powered prediction API for item pricing, sell probability, "
        "repair cost estimation, and sustainability impact scoring."
    ),
    version  = "2.0.0",
    lifespan = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


# ── Request / Response Schemas ────────────────────────────────────────────────

class PredictRequest(BaseModel):
    category:        str   = Field(default="other",  description="Item category (Men/Women/Kids/Shoes/Electronics/…)")
    condition_score: float = Field(...,              description="Condition score 0.0 – 1.0")
    base_price:      float = Field(default=0.0,      description="Base price in INR (0 = use category default)")
    age:             float = Field(default=0.0,      description="Item age in years")
    brand:           str   = Field(default="",       description="Brand name (optional)")

    @field_validator("condition_score")
    @classmethod
    def validate_condition(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("condition_score must be between 0.0 and 1.0")
        return round(v, 4)

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: float) -> float:
        if v < 0:
            raise ValueError("age cannot be negative")
        return round(v, 1)

    @field_validator("base_price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError("base_price cannot be negative")
        return round(v, 2)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "category":        "Men",
                "condition_score": 0.82,
                "base_price":      1200.0,
                "age":             1.5,
                "brand":           "Nike",
            }]
        }
    }


class ImpactOut(BaseModel):
    co2_saved:     float = Field(description="CO₂ saved in kg")
    beneficiaries: int   = Field(description="Estimated beneficiaries (donated items only)")


class PredictResponse(BaseModel):
    predicted_price:  float    = Field(description="ML-estimated market price (INR)")
    repair_cost:      float    = Field(description="Estimated refurbishment cost (INR, 0 if not refurbish)")
    sell_probability: float    = Field(description="Probability item can be sold (0.0 – 1.0)")
    decision:         str      = Field(description="AI decision: resell | refurbish | donate")
    impact:           ImpactOut
    model_version:    str      = Field(default="xgboost-v2")
    _source:          str      = "ml_api"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
async def root():
    """Service metadata."""
    return {
        "service":    "EcoWardrobe ML Service",
        "version":    "2.0.0",
        "models":     ["XGBRegressor (price)", "XGBClassifier (sell)", "XGBRegressor (repair)"],
        "categories": VALID_CATEGORIES,
        "endpoints":  {
            "predict": "POST /predict",
            "health":  "GET  /health",
            "docs":    "GET  /docs",
        },
    }


@app.get("/health", tags=["Info"])
async def health():
    """Health check used by the Node.js backend."""
    return {
        "status":       "healthy",
        "models_ready": ml._models_loaded,
    }


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict(req: PredictRequest):
    """
    ## Predict item valuation and sustainability impact

    Accepts item attributes and returns:
    - **predicted_price** — XGBoost regression output (INR)
    - **repair_cost** — estimated refurbishment cost (INR)
    - **sell_probability** — XGBoost classifier confidence (0-1)
    - **decision** — `resell` | `refurbish` | `donate`
    - **impact** — CO₂ saved + beneficiary count
    """
    if not ml._models_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading. Retry in a moment.")

    try:
        result = ml.predict(
            category        = req.category,
            condition_score = req.condition_score,
            base_price      = req.base_price,
            age             = req.age,
            brand           = req.brand,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        log.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    log.info(
        f"[predict] category={normalize_category(req.category)} "
        f"score={req.condition_score} → decision={result.decision} "
        f"price=₹{result.predicted_price} sell_prob={result.sell_probability}"
    )

    return PredictResponse(
        predicted_price  = result.predicted_price,
        repair_cost      = result.repair_cost,
        sell_probability = result.sell_probability,
        decision         = result.decision,
        impact           = ImpactOut(**result.impact),
        model_version    = "xgboost-v2",
    )
