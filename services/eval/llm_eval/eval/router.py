from fastapi import APIRouter

from llm_eval.eval.evaluate_results.router import (
    router as evaluate_results_router,
)
from llm_eval.eval.evaluations.router import router as evaluations_router

router = APIRouter(prefix="/eval")
router.include_router(evaluations_router)
router.include_router(evaluate_results_router)
