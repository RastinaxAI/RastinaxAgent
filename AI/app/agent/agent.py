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

_client = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        load_dotenv()
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY یافت نشد.")
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
    return _client

async def run_agent_stream(user_input: str, chat_history: list = None):
    try:
        client = get_client()
    except Exception as e:
        yield f"خطا در پیکربندی: {str(e)}"
        return

    if not chat_history:
        chat_history = [{"role": "system", "content": SYSTEM_PROMPT}]

    chat_history.append({"role": "user", "content": user_input})

    try:
        check_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_history,
            tools=tools_schema if tools_schema else None
        )

        response_message = check_response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
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

            stream_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=chat_history,
                stream=True
            )
            for chunk in stream_response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
            return

        stream_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_history,
            stream=True
        )
        for chunk in stream_response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    except OpenAIError as e:
        yield f"خطای ارتباط با هوش مصنوعی: {str(e)}"
    except Exception as e:
        yield f"خطای غیرمنتظره: {str(e)}"