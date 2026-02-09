from pathlib import Path
from typing import Any

from celery import Celery
from celery.bootsteps import StartStopStep
from celery.signals import worker_ready, worker_shutdown

# IMPORTANT: Load environment variables FIRST before importing settings
from llm_eval.utils.env import load_env

load_env()

from llm_eval.settings import SETTINGS  # noqa: E402
from llm_eval.utils.data_dir import setup_data_dir  # noqa: E402
from llm_eval.utils.ssl import setup_custom_ssl_cert  # noqa: E402

setup_data_dir()
setup_custom_ssl_cert()

HEARTBEAT_FILE = Path(SETTINGS.celery.heartbeat_file)
READINESS_FILE = Path(SETTINGS.celery.readiness_file)


class LivenessProbe(StartStopStep):
    requires = {"celery.worker.components:Timer"}

    def __init__(self, parent, **kwargs: dict[str, Any]) -> None:  # noqa: ANN001
        super().__init__(parent, **kwargs)
        self.requests = []
        self.tref = None

    def start(self, parent) -> None:  # noqa: ANN001
        self.tref = parent.timer.call_repeatedly(
            1.0,
            self._update_heartbeat_file,
            (parent,),
            priority=10,
        )

    def stop(self, parent) -> None:  # noqa: ANN001
        HEARTBEAT_FILE.unlink(missing_ok=True)

    # noinspection PyMethodMayBeStatic
    def _update_heartbeat_file(self, parent) -> None:  # noqa: ANN001
        HEARTBEAT_FILE.touch()


@worker_ready.connect
def _worker_ready(**_: dict[str, Any]) -> None:
    READINESS_FILE.touch()


@worker_shutdown.connect
def _worker_shutdown(**_: dict[str, Any]) -> None:
    READINESS_FILE.unlink(missing_ok=True)


app = Celery(
    "tasks",
    broker=SETTINGS.celery.broker,
    include=[
        "llm_eval.eval.evaluations.tasks.start_evaluation_task",
        "llm_eval.eval.evaluations.tasks.retrieve_answer_task",
        "llm_eval.eval.evaluations.tasks.evaluate_test_case_task",
        "llm_eval.eval.evaluations.tasks.complete_evaluation_task",
        "llm_eval.eval.evaluations.tasks.handle_evaluation_error_task",
        "llm_eval.eval.evaluations.tasks.handle_test_case_error_task",
        "llm_eval.qa_catalog.tasks.handle_generate_catalog_task",
    ],
)
app.conf.update(
    task_acks_late=True,
    task_acks_on_failure_or_timeout=False,
    task_reject_on_worker_lost=True,
)
app.steps["worker"].add(LivenessProbe)
