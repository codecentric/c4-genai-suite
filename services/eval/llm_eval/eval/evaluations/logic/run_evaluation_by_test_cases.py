from datetime import datetime
from uuid import uuid4

from fastapi import BackgroundTasks

from llm_eval.database.model import (
    Evaluation,
    EvaluationStatus,
    TestCase,
    TestCaseStatus,
)
from llm_eval.auth.user_principal import UserPrincipal
from llm_eval.db import SessionDep
from llm_eval.eval.evaluations.tasks.start_evaluation_task import (
    submit_start_evaluation_task,
)
from llm_eval.metrics.db.find_metric import find_metrics_by_ids
from llm_eval.responses import bad_request
from llm_eval.schemas import ApiModel


class RunEvaluationByTestCasesTestCase(ApiModel):
    grouping_key: str | None = None
    index: int = 0
    input: str | None = None
    actual_output: str
    expected_output: str
    context: list[str] | None = None
    retrieval_context: list[str] | None = None
    meta_data: dict | None = None
    llm_configuration_id: str | None = None
    llm_configuration_name: str | None = None
    llm_configuration_version: str | None = None


class RunEvaluationByTestCases(ApiModel):
    metrics: list[str]
    name: str | None = None
    test_cases: list[RunEvaluationByTestCasesTestCase]


class StartRunEvaluationByTestCasesLogic:
    def __init__(self, background_tasks: BackgroundTasks, session: SessionDep) -> None:
        self._background_tasks = background_tasks
        self._session = session

    async def run(
        self, evaluation_create: RunEvaluationByTestCases, principal: UserPrincipal
    ) -> Evaluation:
        metrics = await find_metrics_by_ids(self._session, evaluation_create.metrics)

        if len(metrics) != len(evaluation_create.metrics):
            raise bad_request("Not all metrics were found.")

        now = datetime.now()
        evaluation = Evaluation(
            id=str(uuid4()),
            name=evaluation_create.name,
            created_at=now,
            updated_at=now,
            created_by=principal.id,
            updated_by=principal.id,
            status=EvaluationStatus.PENDING,
            metrics=metrics,
        )
        self._session.add(evaluation)

        await self._create_test_cases(evaluation, evaluation_create.test_cases)

        await self._session.flush()

        submit_start_evaluation_task(evaluation.id)

        return evaluation

    async def _create_test_cases(
        self,
        evaluation: Evaluation,
        test_cases: list[RunEvaluationByTestCasesTestCase],
    ) -> None:
        for test_case in test_cases:
            tc = TestCase(
                id=str(uuid4()),
                status=TestCaseStatus.EVALUATING,
                grouping_key=test_case.grouping_key,
                index=test_case.index,
                input=test_case.input,
                actual_output=test_case.actual_output,
                expected_output=test_case.expected_output,
                context=test_case.context,
                retrieval_context=test_case.retrieval_context,
                meta_data=test_case.meta_data,
                llm_configuration_id=test_case.llm_configuration_id,
                llm_configuration_name=test_case.llm_configuration_name,
                llm_configuration_version=test_case.llm_configuration_version,
                evaluation_id=evaluation.id,
            )

            self._session.add(tc)
