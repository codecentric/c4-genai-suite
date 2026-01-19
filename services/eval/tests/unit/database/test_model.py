from typing import List

import pytest

from llm_eval.database.model import TestCase, TestCaseStatus

FINISHED_STATES = [TestCaseStatus.SUCCESS, TestCaseStatus.FAILURE]


def statuses() -> List[tuple]:
    return [(i.name, i.name in FINISHED_STATES) for i in TestCaseStatus]


@pytest.mark.parametrize("status", statuses())
def test_testcase_is_finished(status: tuple) -> None:
    test_case = TestCase()
    test_case.status = status[0]

    assert test_case.is_finished() == status[1]
