from app.agent.agent_service import get_client


if __name__ == "__main__":
    client = get_client()
    response = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[{"role": "user", "content": "سلام، خودت را معرفی کن."}],
    )
    print(response.choices[0].message.content)
