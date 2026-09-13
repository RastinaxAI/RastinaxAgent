import uuid

from django.utils import timezone

from agents.models import Agent, Conversation, Message
from agents.services.agent_client import AgentClient


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

    # =====================================================
    # Streaming chat
    # =====================================================

    def stream_message(
        self,
        message: str,
        conversation_id=None,
        visitor_id=None,
        user=None,
    ):
        """
        Creates or continues a conversation.

        Returns:
            conversation
            user_message
            agent stream
        """

        # ---------------------------------------------
        # Find active AI agent
        # ---------------------------------------------

        agent = (
            Agent.objects
            .filter(is_active=True)
            .first()
        )

        if not agent:
            raise NoActiveAgentError(
                "No active agent is configured."
            )

        is_authenticated = getattr(
            user,
            "is_authenticated",
            False,
        )

        # ---------------------------------------------
        # Normalize visitor_id
        # ---------------------------------------------

        if visitor_id:
            try:
                visitor_id = uuid.UUID(
                    str(visitor_id)
                )

            except (ValueError, TypeError):
                raise ChatServiceError(
                    "Invalid visitor_id."
                )

        # ---------------------------------------------
        # Existing conversation
        # ---------------------------------------------

        if conversation_id:

            conversation = self._get_conversation(
                conversation_id=conversation_id,
                visitor_id=visitor_id,
                user=user,
            )

        # ---------------------------------------------
        # New conversation
        # ---------------------------------------------

        else:

            # Guest user
            if (
                not is_authenticated
                and not visitor_id
            ):
                visitor_id = uuid.uuid4()

            conversation = (
                Conversation.objects.create(
                    agent=agent,

                    user=(
                        user
                        if is_authenticated
                        else None
                    ),

                    visitor_id=visitor_id,
                )
            )

        # ---------------------------------------------
        # Build previous chat history
        #
        # IMPORTANT:
        # باید قبل از ذخیره پیام جدید ساخته شود.
        # چون message جدید جداگانه به عنوان
        # user_input برای Agent ارسال می‌شود.
        # ---------------------------------------------

        chat_history = self._build_chat_history(
            conversation
        )

        # ---------------------------------------------
        # Save current user message
        # ---------------------------------------------

        user_message = Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=message,
        )

        # ---------------------------------------------
        # Conversation title
        # ---------------------------------------------

        if not conversation.title:
            conversation.title = message[:100]

        # Update sidebar ordering
        conversation.updated_at = timezone.now()

        conversation.save(
            update_fields=[
                "title",
                "updated_at",
            ]
        )

        # ---------------------------------------------
        # Start AI Agent stream
        # ---------------------------------------------

        agent_stream = (
            self.agent_client.stream_chat(
                user_input=message,
                chat_history=chat_history,
            )
        )

        return {
            "conversation": conversation,
            "user_message": user_message,
            "stream": agent_stream,
        }

    # =====================================================
    # Save completed assistant response
    # =====================================================

    def save_assistant_message(
        self,
        conversation: Conversation,
        content: str,
    ) -> Message:

        assistant_message = (
            Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=content,
            )
        )

        # باعث می‌شود Conversation
        # در Sidebar به بالای لیست بیاید.
        conversation.updated_at = timezone.now()

        conversation.save(
            update_fields=[
                "updated_at",
            ]
        )

        return assistant_message

    # =====================================================
    # Build history from PostgreSQL
    # =====================================================

    def _build_chat_history(
        self,
        conversation: Conversation,
    ):

        messages = (
            conversation.messages
            .order_by("created_at")
        )

        history = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]

        if not history:
            return None

        return history

    # =====================================================
    # Get & authorize conversation
    # =====================================================

    def _get_conversation(
        self,
        conversation_id,
        visitor_id,
        user,
    ) -> Conversation:

        try:
            conversation = (
                Conversation.objects.get(
                    id=conversation_id,
                    is_active=True,
                )
            )

        except Conversation.DoesNotExist:
            raise ConversationNotFoundError(
                "Conversation not found."
            )

        is_authenticated = getattr(
            user,
            "is_authenticated",
            False,
        )

        # ---------------------------------------------
        # Logged-in user
        # ---------------------------------------------

        if is_authenticated:

            if conversation.user_id != user.id:
                raise ConversationAccessDeniedError(
                    "You do not have access "
                    "to this conversation."
                )

        # ---------------------------------------------
        # Guest visitor
        # ---------------------------------------------

        else:

            if not visitor_id:
                raise ConversationAccessDeniedError(
                    "visitor_id is required."
                )

            if (
                conversation.visitor_id
                != visitor_id
            ):
                raise ConversationAccessDeniedError(
                    "Invalid visitor."
                )

        return conversation