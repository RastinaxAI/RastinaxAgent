def get_market_trends(topic: str) -> str:
    return f"Trending stats for {topic}: Search volume increased by 45% this month."


def generate_caption(product: str) -> str:
    return f"Caption for {product}: Boost your business with smart digital marketing! 🚀"


tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "get_market_trends",
            "description": "Get market trends and stats for a given marketing topic",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Marketing topic name"
                    }
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_caption",
            "description": "Generate a marketing caption for a product",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {
                        "type": "string",
                        "description": "Product or service name"
                    }
                },
                "required": ["product"]
            }
        }
    }
]


available_tools = {
    "get_market_trends": get_market_trends,
    "generate_caption": generate_caption
}