from typing import Any

import httpx
from django.conf import settings


class AgentAPIError(Exception):
    """
    Raised when communication with the external AI Agent fails.
    """

    pass


class AgentClient:
    CHAT_ENDPOINT = "/api/v1/chat"

    def __init__(self):
        self.base_url = settings.AI_AGENT_BASE_URL.rstrip("/")
        self.timeout = settings.AI_AGENT_TIMEOUT

    def chat(
        self,
        user_input: str,
        chat_history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:

        payload = {
            "user_input": user_input,
            "chat_history": chat_history,
        }

        try:
            response = httpx.post(
                f"{self.base_url}{self.CHAT_ENDPOINT}",
                json=payload,
                timeout=self.timeout,
                trust_env=False,
            )

            response.raise_for_status()

        except httpx.TimeoutException as exc:
            raise AgentAPIError(
                "AI Agent request timed out."
            ) from exc

        except httpx.RequestError as exc:
            raise AgentAPIError(
                "Could not connect to AI Agent service."
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise AgentAPIError(
                f"AI Agent returned HTTP {exc.response.status_code}."
            ) from exc

        except httpx.HTTPError as exc:
            raise AgentAPIError(
                "AI Agent communication failed."
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise AgentAPIError(
                "AI Agent returned invalid JSON."
            ) from exc

        if not isinstance(data, dict):
            raise AgentAPIError(
                "AI Agent returned an invalid response object."
            )

        if not isinstance(data.get("response"), str):
            raise AgentAPIError(
                "AI Agent response does not contain a valid 'response'."
            )

        if not isinstance(data.get("chat_history"), list):
            raise AgentAPIError(
                "AI Agent response does not contain a valid 'chat_history'."
            )

        return {
            "response": data["response"],
            "chat_history": data["chat_history"],
        }
