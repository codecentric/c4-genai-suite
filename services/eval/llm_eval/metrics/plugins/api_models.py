from typing import Annotated, Union

from pydantic import Discriminator

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

MetricConfigurationRead = Annotated[
    Union[
        GEvalMetricConfigurationRead,
        AnswerRelevancyMetricConfigurationRead,
        HallucinationMetricConfigurationRead,
        FaithfulnessMetricConfigurationRead,
    ],
    Discriminator("type"),
]

MetricConfigurationCreate = Annotated[
    Union[
        GEvalMetricConfigurationCreate,
        AnswerRelevancyMetricConfigurationCreate,
        HallucinationMetricConfigurationCreate,
        FaithfulnessMetricConfigurationCreate,
    ],
    Discriminator("type"),
]

MetricConfigurationUpdate = Annotated[
    Union[
        GEvalMetricConfigurationUpdate,
        AnswerRelevancyMetricConfigurationUpdate,
        HallucinationMetricConfigurationUpdate,
        FaithfulnessMetricConfigurationUpdate,
    ],
    Discriminator("type"),
]
