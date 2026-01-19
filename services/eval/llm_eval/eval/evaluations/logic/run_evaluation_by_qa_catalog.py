from datetime import datetime
from uuid import uuid4

from llm_eval.database.model import (
    Evaluation,
    EvaluationStatus,
    QACatalog,
    QAPair,
    TestCase,
    TestCaseStatus,
)
from llm_eval.auth.user_principal import UserPrincipal
from llm_eval.db import SessionDep
from llm_eval.eval.evaluations.tasks.start_evaluation_task import (
    submit_start_evaluation_task,
)
from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.metrics.db.find_metric import find_metrics_by_ids
from llm_eval.responses import bad_request
from llm_eval.schemas import ApiModel


class RunEvaluationByQaCatalog(ApiModel):
    name: str
    catalog_id: str
    llm_endpoint_id: str
    metrics: list[str]
    test_cases_per_qa_pair: int = 3


class StartRunEvaluationByQaCatalogLogic:
    _session: SessionDep

    def __init__(self, session: SessionDep) -> None:
        self._session = session

    async def run(
        self, dto: RunEvaluationByQaCatalog, principal: UserPrincipal
    ) -> Evaluation:
        llm_endpoint = await find_llm_endpoint(self._session, dto.llm_endpoint_id)

        if llm_endpoint is None:
            raise bad_request(f"No LLM endpoint found for ID {dto.llm_endpoint_id}")

        metrics = await find_metrics_by_ids(self._session, dto.metrics)

        if len(metrics) != len(dto.metrics):
            raise bad_request("Not all metrics were found.")

        now = datetime.now()
        evaluation = Evaluation(
            id=str(uuid4()),
            name=dto.name,
            created_at=now,
            updated_at=now,
            created_by=principal.id,
            updated_by=principal.id,
            catalog_id=dto.catalog_id,
            llm_endpoint_id=dto.llm_endpoint_id,
            status=EvaluationStatus.PENDING,
            metrics=metrics,
        )

        self._session.add(evaluation)

        await self._session.flush()

        await self._create_test_cases(evaluation, dto.test_cases_per_qa_pair)

        await self._session.flush()

        submit_start_evaluation_task(evaluation.id)

        return evaluation

    async def _create_test_cases(
        self,
        evaluation: Evaluation,
        test_cases_per_qa_pair: int,
    ) -> None:
        catalog: QACatalog = await evaluation.awaitable_attrs.catalog
        if not catalog:
            raise Exception(f"Evaluation '{evaluation.id}' does not have a QA catalog.")

        qa_pairs: list[QAPair] = await catalog.awaitable_attrs.qa_pairs

        for qa_pair in qa_pairs:
            grouping_key = str(uuid4())

            for test_case_index in range(test_cases_per_qa_pair):
                test_case = TestCase(
                    id=str(uuid4()),
                    status=TestCaseStatus.RETRIEVING_ANSWER,
                    index=test_case_index,
                    input=qa_pair.question,
                    expected_output=qa_pair.expected_output,
                    context=qa_pair.contexts,
                    meta_data=qa_pair.meta_data,
                    grouping_key=grouping_key,
                    evaluation_id=evaluation.id,
                )
                self._session.add(test_case)
