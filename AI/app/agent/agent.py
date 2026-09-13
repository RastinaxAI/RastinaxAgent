import asyncio
import os
import sys
import json
import time
from pathlib import Path
from openai import AsyncOpenAI, OpenAIError
from dotenv import load_dotenv

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from app.agent.tools import tools_schema, available_tools

load_dotenv()

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "gpt-4o-mini")

# سرعت نمایش استریم (کاراکتر بر ثانیه). برای تایپ تدریجی و قابل‌دیدن.
STREAM_CHARS_PER_SECOND = float(os.getenv("STREAM_CHARS_PER_SECOND", "150"))


async def _pace(sent_chars: int, started_at: float) -> None:
    """Output را با سرعت STREAM_CHARS_PER_SECOND محدود می‌کند؛
    بدون تأخیر اضافه اگر مدل خودش کند باشد."""
    delay = started_at + sent_chars / STREAM_CHARS_PER_SECOND - time.monotonic()
    if delay > 0:
        await asyncio.sleep(delay)

SYSTEM_PROMPT = """You are a professional AI marketing and sales assistant for "Rastinax" (آژانس دیجیتال مارکتینگ و هوش مصنوعی راستیناکس).

Company Overview & Background:
- Name: Rastinax (راستیناکس)
- History: Started activity in IT in 2008 (1387), specialized in desktop/mobile software in 2018 (1397), and currently a leading company in digital transformation, digital marketing, and AI solutions.
- Tagline: راستیناکس، هم‌راستا با رشد برند شما!
- Mission: Helping brands achieve real and sustainable growth through powerful digital presence and AI automation.

Main Services Provided by Rastinax:
1. Web Design & Support (طراحی و پشتیبانی سایت): Corporate, E-commerce, Custom/WordPress, PWA, redesign, and fast setup.
2. SEO & Optimization (سئو و بهینه سازی): Keyword research, content strategy, technical SEO, link building, competitor analysis, and SEO consulting.
3. Artificial Intelligence Solutions (خدمات هوش مصنوعی): AI consulting, custom AI agents, automated workflow systems, intelligent chatbots, and AI integration for businesses in Tehran & Karaj.
4. Mobile App Development (طراحی اپلیکیشن موبایل): Android and Hybrid/PWA app development.
5. Graphic & UI/UX Design (گرافیک و طراحی تجربه کاربری): Motion graphics, modern UI/UX design, visual identity.
6. Content & Social Media Marketing (تولید محتوا و تبلیغات): Social media management (Instagram, Bale, Rubika), marketplace content, and ad campaigns.
7. Business & Marketing Consulting (مشاوره کسب‌وکار و مارکتینگ): Free consultation, performance auditing, website analysis, and strategy planning.

Contact & Office Information:
- Phone Numbers: 
  * Tehran: 021-91322922
  * Karaj: 026-32761563
  * Mobile / Direct: 09126670804 | 09900823122
- Addresses:
  * Karaj: کرج، میدان والفجر، خیابان سرداران شرقی، نرسیده به کانون وکلا، ساختمان مروارید، طبقه ۲، واحد ۲
  * Tehran: تهران، جردن، خیابان گلفام، پلاک ۵۰، طبقه ۱
- Email: info@rastinax.com
- Working Hours: Saturday to Wednesday, 9:00 AM to 5:30 PM.

General Business Conditions & Pricing Policies:
- Delivery Time: Standard website delivery takes 20 to 25 working days (Express delivery in under 12 days available).
- Payment Conditions: Flexible installment plans. Usually 50% upfront upon contract and 50% after delivery. SEO services are paid monthly.
- Technical Support: 1 year of free technical support for web design projects.

Instructions for AI Response:
1. Always maintain a warm, highly professional, polite, and persuasive tone as a Rastinax representative.
2. If the user asks about Rastinax (services, background, pricing policy, delivery times, contact info, or locations), respond accurately using the context above.
3. If the user asks general marketing, SEO, or web development questions, provide insightful expert answers while introducing relevant Rastinax services naturally.
4. Always respond in Persian (Farsi) unless explicitly addressed in another language.
"""

_client = None

def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY یافت نشد.")
        # نکته مهم: حتماً AsyncOpenAI؛ فراخوانی سینک/blocking داخل
        # async generator باعث می‌شود uvicorn نتواند chunkها را
        # موقع تولید بفرستد و کل پاسخ یکجا در انتها flush شود.
        _client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
    return _client

def _build_messages(user_input: str, chat_history: list = None) -> list:
    """
    تاریخچه‌ای که Django می‌فرستد فقط user/assistant دارد؛
    system prompt همیشه باید سرِ لیست باشد تا شخصیت Agent
    در ادامه گفتگو حفظ شود.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in (chat_history or []):
        if item.get("role") == "system":
            continue
        messages.append({
            "role": item.get("role"),
            "content": item.get("content"),
        })
    messages.append({"role": "user", "content": user_input})
    return messages

async def run_agent_stream(user_input: str, chat_history: list = None):
    """
    استریم واقعی: توکن‌ها بلافاصله بعد از تولید yield می‌شوند.
    اگر مدل در حین استریم tool call بخواهد، ابزار اجرا و
    پاسخ نهایی در همان استریم ادامه پیدا می‌کند.
    """
    try:
        client = get_client()
    except Exception as e:
        yield f"خطا در پیکربندی: {str(e)}"
        return

    messages = _build_messages(user_input, chat_history)

    try:
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            tools=tools_schema if tools_schema else None,
            stream=True,
        )

        tool_calls: dict[int, dict] = {}
        content_parts: list[str] = []
        stream_started = time.monotonic()
        sent_chars = 0

        async for chunk in stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            if delta and delta.content:
                content_parts.append(delta.content)
                sent_chars += len(delta.content)
                yield delta.content
                await _pace(sent_chars, stream_started)

            if delta and delta.tool_calls:
                for tool_call in delta.tool_calls:
                    entry = tool_calls.setdefault(
                        tool_call.index,
                        {"id": "", "name": "", "arguments": ""},
                    )
                    if tool_call.id:
                        entry["id"] = tool_call.id
                    if tool_call.function:
                        if tool_call.function.name:
                            entry["name"] += tool_call.function.name
                        if tool_call.function.arguments:
                            entry["arguments"] += tool_call.function.arguments

        if not tool_calls:
            return

        # مدل ابزار خواسته است؛ اجرا و سپس استریم پاسخ نهایی
        parsed_calls = [
            tool_calls[index] for index in sorted(tool_calls)
        ]

        messages.append({
            "role": "assistant",
            "content": "".join(content_parts) or None,
            "tool_calls": [
                {
                    "id": entry["id"],
                    "type": "function",
                    "function": {
                        "name": entry["name"],
                        "arguments": entry["arguments"],
                    },
                }
                for entry in parsed_calls
            ],
        })

        for entry in parsed_calls:
            try:
                args = json.loads(entry["arguments"] or "{}")
                if entry["name"] in available_tools:
                    tool_result = available_tools[entry["name"]](**args)
                else:
                    tool_result = f"Error: unknown tool '{entry['name']}'"
            except Exception as tool_err:
                tool_result = f"Error: {str(tool_err)}"

            messages.append({
                "role": "tool",
                "tool_call_id": entry["id"],
                "content": str(tool_result),
            })

        final_stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            stream=True,
        )
        # پیس‌ینگ پاسخ نهایی از نو شروع می‌شود (زمان اجرای ابزارها
        # نباید در محاسبه سرعت لحاظ شود)
        stream_started = time.monotonic()
        sent_chars = 0
        async for chunk in final_stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            if delta and delta.content:
                sent_chars += len(delta.content)
                yield delta.content
                await _pace(sent_chars, stream_started)

    except OpenAIError as e:
        yield f"خطای ارتباط با هوش مصنوعی: {str(e)}"
    except Exception as e:
        yield f"خطای غیرمنتظره: {str(e)}"
