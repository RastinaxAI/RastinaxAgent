import uuid

from django.db import transaction

from agents.models import Agent, Conversation, Message
from agents.services.agent_client import AgentClient, AgentAPIError


class ChatServiceError(Exception):
    pass


class ConversationNotFoundError(ChatServiceError):
    pass


class ConversationAccessDeniedError(ChatServiceError):
    pass


class NoActiveAgentError(ChatServiceError):
    pass


class ChatService:

    def __init__(self):
        self.agent_client = AgentClient()

    def send_message(
            self,
            message: str,
            conversation_id=None,
            visitor_id=None,
            user=None,
    ):
        agent = Agent.objects.filter(
            is_active=True
        ).first()

        if not agent:
            raise NoActiveAgentError(
                "No active agent is configured."
            )

        is_authenticated = getattr(
            user,
            "is_authenticated",
            False,
        )

        if visitor_id:
            try:
                visitor_id = uuid.UUID(str(visitor_id))
            except (TypeError, ValueError, AttributeError):
                raise ChatServiceError(
                    "Invalid visitor_id."
                )

        if conversation_id:
            conversation = self._get_conversation(
                conversation_id=conversation_id,
                visitor_id=visitor_id,
                user=user,
            )

        else:

            if not is_authenticated and not visitor_id:
                visitor_id = uuid.uuid4()

            conversation = Conversation.objects.create(
                agent=agent,
                user=user if is_authenticated else None,
                visitor_id=visitor_id,
            )

        try:
            user_message = Message.objects.create(
                conversation=conversation,
                role=Message.Role.USER,
                content=message,
            )

            agent_result = self.agent_client.chat(
                user_input=message,
                chat_history=conversation.provider_history,
            )

        except AgentAPIError as exc:
            if conversation_id:
                Message.objects.filter(id=user_message.id).delete()
            else:
                conversation.delete()
            raise ChatServiceError(
                str(exc)
            ) from exc

        with transaction.atomic():

            assistant_message = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=agent_result["response"],
            )

            conversation.provider_history = agent_result["chat_history"]

            if not conversation.title:
                conversation.title = message[:100]

            conversation.save(
                update_fields=[
                    "provider_history",
                    "title",
                    "updated_at",
                ]
            )

        return {
            "conversation_id": conversation.id,
            "visitor_id": conversation.visitor_id,
            "user_message": user_message,
            "assistant_message": assistant_message,
        }

    def _get_conversation(
        self,
        conversation_id,
        visitor_id,
        user,
    ):

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                is_active=True,
            )

        except Conversation.DoesNotExist:
            raise ConversationNotFoundError(
                "Conversation not found."
            )

        if getattr(user, "is_authenticated", False):

            if conversation.user_id != user.id:
                raise ConversationAccessDeniedError(
                    "You do not have access to this conversation."
                )

        else:

            if not visitor_id:
                raise ConversationAccessDeniedError(
                    "visitor_id is required."
                )

            if conversation.visitor_id != visitor_id:
                raise ConversationAccessDeniedError(
                    "Invalid visitor."
                )

        return conversation
