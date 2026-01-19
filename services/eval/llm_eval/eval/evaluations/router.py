import csv
from datetime import datetime
from typing import Annotated, AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from llm_eval.db import SessionDep, get_db
from llm_eval.eval.evaluate_results.db.stream_evaluation_results import (
    EvaluationResultItem,
    stream_evaluation_results,
)
from llm_eval.eval.evaluations.db.find_evaluation import (
    find_evaluation,
    find_evaluations_with_metric_results,
)
from llm_eval.eval.evaluations.logic.delete_evaluation import (
    EvaluationDelete,
    delete_evaluation,
)
from llm_eval.eval.evaluations.logic.find_evaluation_detail_summary import (
    EvaluationDetailSummary,
    find_evaluation_detail_summary,
)
from llm_eval.eval.evaluations.logic.run_evaluation_by_qa_catalog import (
    RunEvaluationByQaCatalog,
    StartRunEvaluationByQaCatalogLogic,
)
from llm_eval.eval.evaluations.logic.run_evaluation_by_test_cases import (
    RunEvaluationByTestCases,
    StartRunEvaluationByTestCasesLogic,
)
from llm_eval.eval.evaluations.logic.update_evaluation import (
    EvaluationUpdate,
    update_evaluation,
)
from llm_eval.eval.evaluations.models import (
    EvaluationResult,
    GetAllEvaluationResult,
)
from llm_eval.responses import not_found, not_found_response
from llm_eval.utils.api import PaginationParamsDep, UserPrincipalDep
from llm_eval.utils.io import Echo

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("", name="Get all", description="Get all evaluations.")
async def get_all(
    db: SessionDep,
    pagination_params: PaginationParamsDep,
    query: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[GetAllEvaluationResult]:
    evaluations = await find_evaluations_with_metric_results(
        db=db,
        pagination_params=pagination_params,
        query=query,
        from_date=from_date,
        to_date=to_date,
    )
    return [
        GetAllEvaluationResult.from_evaluation(evaluation) for evaluation in evaluations
    ]


@router.post(
    "",
    dependencies=[Depends(get_db)],
    description="Performing the evaluation using a QA catalogue. "
    "The test cases are created on the basis of the QA "
    "catalogue and evaluated in the background. ",
)
async def post(
    run_evaluation_logic_by_test_cases: Annotated[
        StartRunEvaluationByTestCasesLogic, Depends()
    ],
    run_evaluation_logic_by_qa_catalog: Annotated[
        StartRunEvaluationByQaCatalogLogic, Depends()
    ],
    principal: UserPrincipalDep,
    dto: RunEvaluationByQaCatalog | RunEvaluationByTestCases,
) -> EvaluationResult:
    if isinstance(dto, RunEvaluationByQaCatalog):
        evaluation = await run_evaluation_logic_by_qa_catalog.run(dto, principal)
    elif isinstance(dto, RunEvaluationByTestCases):
        evaluation = await run_evaluation_logic_by_test_cases.run(dto, principal)
    else:
        raise ValueError(f"Unsupported evaluation type: {type(dto)}")

    return EvaluationResult.model_validate(evaluation)


@router.get("/{evaluation_id}")
async def get(
    db: SessionDep,
    evaluation_id: str,
) -> EvaluationResult:
    evaluation = await find_evaluation(db, evaluation_id)

    return EvaluationResult.model_validate(evaluation)


@router.delete("/{evaluation_id}")
async def delete(
    db: SessionDep, evaluation_id: str, evaluation_delete: EvaluationDelete
) -> None:
    await delete_evaluation(db, evaluation_id, evaluation_delete)


@router.patch("/{evaluation_id}", responses={**not_found_response})
async def patch(
    db: SessionDep,
    evaluation_id: str,
    evaluation_update: EvaluationUpdate,
    principal: UserPrincipalDep,
) -> EvaluationResult:
    evaluation = await update_evaluation(
        db, evaluation_id, evaluation_update, principal.id
    )
    if not evaluation:
        raise not_found("Evaluation not found.")

    return EvaluationResult.model_validate(evaluation)


@router.get("/{evaluation_id}/summary", responses={**not_found_response})
async def get_evaluation_detail_summary(
    db: SessionDep,
    evaluation_id: str,
) -> EvaluationDetailSummary:
    summary = await find_evaluation_detail_summary(db, evaluation_id)

    if summary is None:
        raise not_found("Evaluation not found.")

    return summary


@router.get("/{evaluation_id}/results-export")
async def get_results_export(evaluation_id: str, db: SessionDep) -> StreamingResponse:
    data = stream_evaluation_results(db, evaluation_id)

    fieldnames = list(EvaluationResultItem.model_json_schema()["properties"].keys())

    # TODO: use pandas
    writer = csv.DictWriter(Echo(), fieldnames=fieldnames)
    writer.writeheader()

    filename = f"evaluation-results-{evaluation_id}.csv"

    async def response() -> AsyncIterator[str]:
        yield writer.writeheader()
        async for row in data:
            yield writer.writerow(row.model_dump())

    return StreamingResponse(
        response(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
