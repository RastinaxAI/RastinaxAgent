from typing import Any, Iterator

import httpx
from django.conf import settings


class AgentAPIError(Exception):
    pass


class AgentClient:
    CHAT_ENDPOINT = "/api/v1/chat"

    def __init__(self):
        self.base_url = settings.AI_AGENT_BASE_URL.rstrip("/")
        self.timeout = settings.AI_AGENT_TIMEOUT

    def stream_chat(
        self,
        user_input: str,
        chat_history: list[dict[str, Any]] | None = None,
    ) -> Iterator[str]:

        payload = {
            "user_input": user_input,
            "chat_history": chat_history,
        }

        url = f"{self.base_url}{self.CHAT_ENDPOINT}"

        try:
            with httpx.stream(
                method="POST",
                url=url,
                json=payload,
                timeout=httpx.Timeout(
                    connect=10.0,
                    read=None,
                    write=float(self.timeout),
                    pool=10.0,
                ),
                trust_env=False,
            ) as response:

                if response.is_error:
                    error_body = response.read().decode(
                        "utf-8",
                        errors="replace",
                    )

                    raise AgentAPIError(
                        f"AI Agent returned HTTP "
                        f"{response.status_code}: "
                        f"{error_body}"
                    )

                for chunk in response.iter_text():
                    if chunk:
                        yield chunk

        except AgentAPIError:
            raise

        except httpx.ConnectError as exc:
            raise AgentAPIError(
                "Could not connect to AI Agent service."
            ) from exc

        except httpx.TimeoutException as exc:
            raise AgentAPIError(
                "AI Agent request timed out."
            ) from exc

        except httpx.HTTPError as exc:
            raise AgentAPIError(
                f"AI Agent communication failed: {exc}"
            ) from exc