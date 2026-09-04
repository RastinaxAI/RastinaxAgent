import os
import sys
import json
from pathlib import Path
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from app.agent.tools import tools_schema, available_tools

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
def get_client():
    load_dotenv() # بارگذاری کلید API
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY یافت نشد.")
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )

def run_agent(user_input: str, chat_history: list = None):
    try:
        client = get_client()
    except Exception as e:
        return f"خطا در پیکربندی: {str(e)}", chat_history or []

    if not chat_history:
        chat_history = [{"role": "system", "content": SYSTEM_PROMPT}]

    chat_history.append({"role": "user", "content": user_input})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_history,
            tools=tools_schema if tools_schema else None
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
            # تبدیل به دیکشنری جهت جلوگیری از خطای Pydantic
            chat_history.append(response_message.model_dump())
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                if function_name in available_tools:
                    try:
                        args = json.loads(tool_call.function.arguments)
                        tool_result = available_tools[function_name](**args)
                    except Exception as tool_err:
                        tool_result = f"Error: {str(tool_err)}"

                    chat_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(tool_result)
                    })

            final_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=chat_history
            )
            final_content = final_response.choices[0].message.content
            chat_history.append({"role": "assistant", "content": final_content})
            return final_content, chat_history

        # در حالت پاسخ معمولی متنی
        assistant_content = response_message.content or ""
        chat_history.append({"role": "assistant", "content": assistant_content})
        return assistant_content, chat_history

    except OpenAIError as e:
        return f"خطای ارتباط با هوش مصنوعی: {str(e)}", chat_history
# The legacy implementation above is kept for compatibility with older
# imports. The FastAPI service uses app.agent.agent_service.run_agent.


# The implementation below is the production path used by the FastAPI
# service. It keeps the original prompt above for backwards compatibility
# with older deployments while correcting error handling and input copying.
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


def get_client():
    load_dotenv()
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise AgentConfigurationError("OPENROUTER_API_KEY is not configured.")

    default_headers = {}
    site_url = os.getenv("OPENROUTER_SITE_URL")
    site_name = os.getenv("OPENROUTER_SITE_NAME")
    if site_url:
        default_headers["HTTP-Referer"] = site_url
    if site_name:
        default_headers["X-Title"] = site_name

    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        default_headers=default_headers or None,
    )


def _copy_history(chat_history):
    if chat_history is None:
        return [{"role": "system", "content": SYSTEM_PROMPT}]

    if not isinstance(chat_history, list):
        raise AgentServiceError("chat_history must be an array.")

    history = [
        dict(message)
        for message in chat_history
        if isinstance(message, dict)
    ]
    if not any(message.get("role") == "system" for message in history):
        history.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    return history


def _completion(client, messages, tools=None):
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


def run_agent(user_input: str, chat_history: list | None = None):
    if not isinstance(user_input, str) or not user_input.strip():
        raise AgentServiceError("user_input must not be empty.")

    client = get_client()
    history = _copy_history(chat_history)
    history.append({"role": "user", "content": user_input.strip()})

    response_message = _completion(
        client,
        history,
        tools=available_tools and tools_schema,
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
