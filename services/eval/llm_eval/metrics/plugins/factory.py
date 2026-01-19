from typing import overload

from llm_eval.database.model import EvaluationMetric
from llm_eval.metrics.plugins.impl.answer_relevancy import (
    AnswerRelevancyMetricPlugin,
)
from llm_eval.metrics.plugins.impl.faithfulness import (
    FaithfulnessMetricPlugin,
)
from llm_eval.metrics.plugins.impl.g_eval import GEvalMetricPlugin
from llm_eval.metrics.plugins.impl.hallucination import (
    HallucinationMetricPlugin,
)
from llm_eval.metrics.plugins.interface import (
    BaseConfiguration,
    MetricPlugin,
)

plugins: list[MetricPlugin] = [
    GEvalMetricPlugin(),
    AnswerRelevancyMetricPlugin(),
    HallucinationMetricPlugin(),
    FaithfulnessMetricPlugin(),
]


def get_metric_plugin_types() -> list[str]:
    return [plugin.metric_type for plugin in plugins]


@overload
def get_metric_plugin(metric: EvaluationMetric) -> MetricPlugin: ...


@overload
def get_metric_plugin(metric: str) -> MetricPlugin: ...


def get_metric_plugin(metric: str | EvaluationMetric) -> MetricPlugin:
    if isinstance(metric, EvaluationMetric):
        base_config = BaseConfiguration.model_validate(metric.metric_config)

        metric_type = base_config.type
    else:
        metric_type = metric

    plugin = next(
        (plugin for plugin in plugins if plugin.metric_type == metric_type), None
    )

    if plugin is None:
        raise ValueError(f"No plugin found for metric type {metric_type}.")

    return plugin
