# LLM Eval Service

Internal evaluation service for the C4 GenAI Suite. This service provides LLM evaluation capabilities including:

- QA Catalog management and generation (using RAGAS)
- Evaluation execution with DeepEval metrics
- LLM endpoint configuration
- Dashboard and reporting

## Architecture

This service is an **internal trusted service** - it has no authentication layer. Authentication is handled by the C4 backend (NestJS), which proxies requests to this service.

```
C4 Frontend → C4 Backend (NestJS) → Eval Service (this)
                  ↑
             Auth happens here
```

## Database

The service uses the same PostgreSQL database as C4, but with a separate schema: `llm_eval`.

Tables:
- `llm_eval.qa_catalog_group`
- `llm_eval.qa_catalog`
- `llm_eval.qa_pair`
- `llm_eval.evaluation`
- `llm_eval.test_case`
- `llm_eval.test_case_evaluation_result`
- `llm_eval.llm_endpoint`
- `llm_eval.evaluation_metric`

## Development

### Prerequisites

- Python 3.12+
- Poetry
- PostgreSQL (use C4's dev postgres)
- RabbitMQ (for Celery)

### Setup

```bash
cd services/eval
poetry install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DB`, `PG_PORT` - PostgreSQL connection
- `CELERY_BROKER_HOST`, `CELERY_BROKER_USER`, `CELERY_BROKER_PASSWORD` - RabbitMQ
- `LLM_EVAL_ENCRYPTION_KEY` - For encrypting sensitive config data

### Running the Service

```bash
# Run the FastAPI server
poetry run uvicorn llm_eval.main:app --reload --port 3202

# Run Celery worker (in another terminal)
poetry run celery -A llm_eval.tasks worker --loglevel=info
```

### API Documentation

When running, OpenAPI docs are available at:
- http://localhost:3202/docs (Swagger UI)
- http://localhost:3202/redoc (ReDoc)

## User Context (Optional)

The C4 backend can pass user context via HTTP headers:
- `X-User-Id`: User ID
- `X-User-Name`: Username
- `X-User-Email`: User email

These are used for audit trails and filtering but are not required.

## Endpoints

- `GET /health` - Health check
- `/v1/eval/*` - Evaluation management
- `/v1/qa-catalog/*` - QA catalog management
- `/v1/llm-endpoints/*` - LLM endpoint configuration
- `/v1/metrics/*` - Evaluation metrics configuration
- `/v1/dashboard/*` - Dashboard data
