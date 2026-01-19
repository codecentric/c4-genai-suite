from llm_eval.metrics.plugins.impl.answer_relevancy import (
    AnswerRelevancyMetricConfigurationCreate,
    AnswerRelevancyMetricConfigurationRead,
    AnswerRelevancyMetricConfigurationUpdate,
)
from llm_eval.metrics.plugins.impl.faithfulness import (
    FaithfulnessMetricConfigurationCreate,
    FaithfulnessMetricConfigurationRead,
    FaithfulnessMetricConfigurationUpdate,
)
from llm_eval.metrics.plugins.impl.g_eval import (
    GEvalMetricConfigurationCreate,
    GEvalMetricConfigurationRead,
    GEvalMetricConfigurationUpdate,
)
from llm_eval.metrics.plugins.impl.hallucination import (
    HallucinationMetricConfigurationCreate,
    HallucinationMetricConfigurationRead,
    HallucinationMetricConfigurationUpdate,
)

type MetricConfigurationRead = (
    GEvalMetricConfigurationRead
    | AnswerRelevancyMetricConfigurationRead
    | HallucinationMetricConfigurationRead
    | FaithfulnessMetricConfigurationRead
)

type MetricConfigurationCreate = (
    GEvalMetricConfigurationCreate
    | AnswerRelevancyMetricConfigurationCreate
    | HallucinationMetricConfigurationCreate
    | FaithfulnessMetricConfigurationCreate
)

type MetricConfigurationUpdate = (
    GEvalMetricConfigurationUpdate
    | AnswerRelevancyMetricConfigurationUpdate
    | HallucinationMetricConfigurationUpdate
    | FaithfulnessMetricConfigurationUpdate
)
