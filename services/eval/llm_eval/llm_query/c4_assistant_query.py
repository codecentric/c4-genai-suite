import json
import time
from datetime import datetime

import httpx
from httpx import AsyncClient, HTTPStatusError, ReadTimeout
from loguru import logger

from llm_eval.llm_query.interface import (
    LLMConfiguration,
    LLMQuery,
    LLMQueryResult,
)
from llm_eval.settings import SETTINGS
from llm_eval.utils.decorators import async_retry_on_error
from llm_eval.utils.json_types import JSONObject


class C4AssistantQuery(LLMQuery):
    """
    Query class for C4 assistants using API key service account auth.

    Authenticates with C4 backend using the eval service account's API key
    sent via the standard x-api-key header.
    """

    assistant_id: int
    max_retries: int
    timeout: int

    def __init__(
        self,
        assistant_id: int,
        max_retries: int = 3,
        parallel_queries: int = 1,
        timeout: int = 60,
    ) -> None:
        super().__init__(parallel_queries)

        self.assistant_id = assistant_id
        self.max_retries = max_retries
        self.timeout = timeout

    @property
    def endpoint(self) -> str:
        return SETTINGS.c4_backend.url

    @property
    def common_headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if SETTINGS.c4_backend.api_key:
            headers["x-api-key"] = SETTINGS.c4_backend.api_key
        return headers

    async def query(self, prompt: str, meta_data: JSONObject) -> LLMQueryResult:
        @async_retry_on_error(
            (HTTPStatusError, ReadTimeout),
            self.max_retries,
            lambda e: (
                (500 <= e.response.status_code < 600)
                if isinstance(e, HTTPStatusError)
                else True
            ),
        )
        async def wrapper() -> LLMQueryResult:
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                logger.info(f"Processing prompt: {prompt}")

                configuration_name = await self.get_configuration_name(
                    client, self.assistant_id
                )

                conversation_id = await self._create_conversation(
                    client,
                    self.assistant_id,
                )

                answer = await self._send_prompt(client, conversation_id, prompt)

                logger.info(f"Received answer: {answer}")

                return LLMQueryResult(
                    answer=answer,
                    retrieval_context=None,
                    configuration=LLMConfiguration(
                        id=str(self.assistant_id),
                        name=configuration_name,
                        version=datetime.now().strftime("%Y-%m-%d"),
                    ),
                )

        return await wrapper()

    async def get_configuration_name(
        self, client: AsyncClient, configuration_id: int
    ) -> str | None:
        response = (
            await client.get(
                f"{self.endpoint}/configurations",
                headers=self.common_headers,
            )
        ).raise_for_status()

        configuration = next(
            (x for x in response.json()["items"] if x["id"] == configuration_id), None
        )

        return configuration["name"] if configuration else None

    async def _create_conversation(
        self, client: AsyncClient, configuration_id: int
    ) -> int:
        logger.debug(f"Creating conversation for configuration {configuration_id}")

        request_body = {
            "configurationId": configuration_id,
        }
        start = time.time()
        response = (
            await client.post(
                f"{self.endpoint}/conversations",
                json=request_body,
                headers=self.common_headers,
            )
        ).raise_for_status()
        end = time.time()

        conversation_data = response.json()

        logger.debug(
            f"Successfully created conversation '{conversation_data}' in {end - start}."
        )

        return int(conversation_data["id"])

    async def _send_prompt(
        self, client: AsyncClient, conversation_id: int, prompt: str
    ) -> str:
        logger.debug(f"Sending prompt for conversation: {conversation_id}")

        start = time.time()

        async with client.stream(
            "POST",
            f"{self.endpoint}/conversations/{conversation_id}/messages/sse",
            json={"query": prompt},
            headers=self.common_headers,
            timeout=30,
        ) as response:
            texts: list[str] = []

            async for line in response.raise_for_status().aiter_lines():
                logger.trace(f"Receive line: {line}")

                if line.startswith("data:"):
                    data = json.loads(line[6:].strip())

                    if data["type"] == "chunk":
                        texts.extend(
                            [
                                content["text"]
                                for content in data["content"]
                                if content["type"] == "text"
                            ]
                        )

            end = time.time()
            logger.debug(
                f"Finished prompt for conversation '{conversation_id}'"
                f" in {end - start}."
            )
            return "".join(texts)
