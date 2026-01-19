from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase
from deepeval.test_run import MetricData


class MetricWrapper(BaseMetric):
    def __init__(
        self, evaluation_metric_id: str, name: str, metric: BaseMetric
    ) -> None:
        self.evaluation_metric_id = evaluation_metric_id
        self.name = name
        self.metric = metric

    def matches(self, test_result: MetricData) -> bool:
        return self.__name__ == test_result.name

    def measure(self, test_case: LLMTestCase, *args: any, **kwargs: any) -> float:
        return self.metric.measure(test_case, *args, **kwargs)

    async def a_measure(
        self, test_case: LLMTestCase, *args: any, **kwargs: any
    ) -> float:
        return await self.metric.a_measure(test_case, *args, **kwargs)

    def is_successful(self) -> bool:
        return self.metric.is_successful()

    @property
    def __name__(self) -> str:
        return self.name + "_" + self.evaluation_metric_id

    @property
    def threshold(self) -> float:
        return self.metric.threshold

    @threshold.setter
    def threshold(self, threshold: float) -> None:
        self.metric.threshold = threshold

    @property
    def score(self) -> float | None:
        return self.metric.score

    @score.setter
    def score(self, score: float | None) -> None:
        self.metric.score = score

    @property
    def score_breakdown(self) -> dict:
        return self.metric.score_breakdown

    @score_breakdown.setter
    def score_breakdown(self, score_breakdown: dict) -> None:
        self.metric.score_breakdown = score_breakdown

    @property
    def reason(self) -> str | None:
        return self.metric.reason

    @reason.setter
    def reason(self, reason: str | None) -> None:
        self.metric.reason = reason

    @property
    def success(self) -> bool | None:
        return self.metric.success

    @success.setter
    def success(self, success: bool | None) -> None:
        self.metric.success = success

    @property
    def evaluation_model(self) -> str | None:
        return self.metric.evaluation_model

    @evaluation_model.setter
    def evaluation_model(self, evaluation_model: str | None) -> None:
        self.metric.evaluation_model = evaluation_model

    @property
    def strict_mode(self) -> bool:
        return self.metric.strict_mode

    @strict_mode.setter
    def strict_mode(self, strict_mode: bool) -> None:
        self.metric.strict_mode = strict_mode

    @property
    def async_mode(self) -> bool:
        return self.metric.async_mode

    @async_mode.setter
    def async_mode(self, async_mode: bool) -> None:
        self.metric.async_mode = async_mode

    @property
    def verbose_mode(self) -> bool:
        return self.metric.verbose_mode

    @verbose_mode.setter
    def verbose_mode(self, verbose_mode: bool) -> None:
        self.metric.verbose_mode = verbose_mode

    @property
    def include_reason(self) -> bool:
        return self.metric.include_reason

    @include_reason.setter
    def include_reason(self, include_reason: bool) -> None:
        self.metric.include_reason = include_reason

    @property
    def error(self) -> str | None:
        return self.metric.error

    @error.setter
    def error(self, error: str | None) -> None:
        self.metric.error = error

    @property
    def evaluation_cost(self) -> float | None:
        return self.metric.evaluation_cost

    @evaluation_cost.setter
    def evaluation_cost(self, evaluation_cost: float | None) -> None:
        self.metric.evaluation_cost = evaluation_cost

    @property
    def verbose_logs(self) -> str | None:
        return self.metric.verbose_logs

    @verbose_logs.setter
    def verbose_logs(self, verbose_logs: str | None) -> None:
        self.metric.verbose_logs = verbose_logs
