import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

from app.agent.tools import available_tools, tools_schema


class AgentConfigurationError(RuntimeError):
    """Raised when the Agent service is not configured correctly."""


class AgentServiceError(RuntimeError):
    """Raised when the upstream LLM cannot produce a valid response."""


SYSTEM_PROMPT = """تو دستیار حرفه‌ای بازاریابی و فروش شرکت «راستیناکس» هستی.

راستیناکس از سال ۱۳۸۷ در حوزه فناوری اطلاعات فعالیت می‌کند و امروز در زمینه
تحول دیجیتال، بازاریابی دیجیتال و راهکارهای هوش مصنوعی به کسب‌وکارها کمک می‌کند.
شعار برند: «راستیناکس، هم‌راستا با رشد برند شما!»

خدمات اصلی:
۱. طراحی و پشتیبانی سایت شرکتی، فروشگاهی، وردپرسی، اختصاصی و PWA
۲. سئو و بهینه‌سازی، تحقیق کلمات کلیدی، استراتژی محتوا و سئوی فنی
۳. مشاوره هوش مصنوعی، ساخت ایجنت، چت‌بات و اتوماسیون فرایندها
۴. طراحی اپلیکیشن موبایل اندروید و Hybrid/PWA
۵. طراحی گرافیک و UI/UX، هویت بصری و موشن‌گرافیک
۶. تولید محتوا، مدیریت شبکه‌های اجتماعی و کمپین‌های تبلیغاتی
۷. مشاوره کسب‌وکار، تحلیل سایت و تدوین استراتژی بازاریابی

اطلاعات تماس:
- تهران: ۰۲۱-۹۱۳۲۲۹۲۲
- کرج: ۰۲۶-۳۲۷۶۱۵۶۳
- تماس مستقیم: ۰۹۱۲۶۶۷۰۸۰۴ و ۰۹۹۰۰۸۲۳۱۲۲
- ایمیل: info@rastinax.com
- ساعات کاری: شنبه تا چهارشنبه، ساعت ۹ تا ۱۷:۳۰

شرایط عمومی:
- زمان استاندارد تحویل سایت ۲۰ تا ۲۵ روز کاری است و تحویل فوری کمتر از ۱۲ روز نیز ممکن است.
- پرداخت معمولاً ۵۰ درصد هنگام قرارداد و ۵۰ درصد پس از تحویل انجام می‌شود.
- پروژه‌های طراحی سایت یک سال پشتیبانی فنی رایگان دارند.

همیشه با لحنی گرم، حرفه‌ای، دقیق و متقاعدکننده پاسخ بده. پاسخ‌ها را فارسی بنویس،
مگر اینکه کاربر صریحاً زبان دیگری بخواهد. اگر پرسش عمومی درباره بازاریابی، سئو،
محتوا یا طراحی سایت بود، پاسخ کاربردی بده و در صورت ارتباط، خدمات راستیناکس را
طبیعی معرفی کن. درباره قیمت قطعی یا اطلاعاتی که در این متن نیست، حدس نزن و کاربر
را به تماس با شرکت راهنمایی کن."""


def get_client() -> OpenAI:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise AgentConfigurationError("OPENROUTER_API_KEY is not configured.")

    headers: dict[str, str] = {}
    site_url = os.getenv("OPENROUTER_SITE_URL")
    site_name = os.getenv("OPENROUTER_SITE_NAME")
    if site_url:
        headers["HTTP-Referer"] = site_url
    if site_name:
        headers["X-Title"] = site_name

    options: dict[str, Any] = {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": api_key,
    }
    if headers:
        options["default_headers"] = headers

    return OpenAI(**options)


def _copy_history(chat_history: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if chat_history is None:
        return [{"role": "system", "content": SYSTEM_PROMPT}]

    if not isinstance(chat_history, list):
        raise AgentServiceError("chat_history must be an array.")

    history = [
        dict(message)
        for message in chat_history
        if isinstance(message, dict) and message.get("role")
    ]
    if not any(message.get("role") == "system" for message in history):
        history.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    return history


def _completion(
    client: OpenAI,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
):
    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
            messages=messages,
            tools=tools or None,
        )
    except OpenAIError as exc:
        raise AgentServiceError(
            "The upstream AI service returned an error."
        ) from exc

    if not response.choices:
        raise AgentServiceError("The upstream AI service returned no choices.")
    return response.choices[0].message


def run_agent(
    user_input: str,
    chat_history: list[dict[str, Any]] | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    if not isinstance(user_input, str) or not user_input.strip():
        raise AgentServiceError("user_input must not be empty.")

    client = get_client()
    history = _copy_history(chat_history)
    history.append({"role": "user", "content": user_input.strip()})

    response_message = _completion(
        client,
        history,
        tools=tools_schema if available_tools else None,
    )
    tool_calls = response_message.tool_calls or []

    if tool_calls:
        history.append(response_message.model_dump(exclude_none=True))

        for tool_call in tool_calls:
            function_name = tool_call.function.name
            tool = available_tools.get(function_name)
            if tool is None:
                tool_result = f"Unknown tool: {function_name}"
            else:
                try:
                    arguments = json.loads(tool_call.function.arguments or "{}")
                    tool_result = tool(**arguments)
                except Exception as exc:
                    tool_result = f"Tool error: {exc}"

            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(tool_result),
                }
            )

        final_message = _completion(client, history)
        content = final_message.content or ""
    else:
        content = response_message.content or ""

    if not content.strip():
        raise AgentServiceError("The upstream AI service returned empty text.")

    history.append({"role": "assistant", "content": content})
    return content, history
