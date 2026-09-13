from django.http import StreamingHttpResponse

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from rest_framework import status
from rest_framework.permissions import AllowAny

from rest_framework.response import Response
from rest_framework.views import APIView

from agents.models import Conversation



from agents.serializers import (
    ChatRequestSerializer,
    ConversationListSerializer,
    ConversationDetailSerializer,
)

from agents.services.agent_client import AgentAPIError

from agents.services.chat_service import (
    ChatService,
    ChatServiceError,
    ConversationNotFoundError,
    ConversationAccessDeniedError,
    NoActiveAgentError,
)
from agents.renderers import IgnoreAcceptContentNegotiation

# =========================================================
# Chat API
# =========================================================

class ChatAPIView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    content_negotiation_class = (
        IgnoreAcceptContentNegotiation
    )

    @extend_schema(
        request=ChatRequestSerializer,
        responses={
            (200, "text/plain"): OpenApiTypes.STR,
        },
        summary="Stream AI chat response",
        description=(
            "Creates or continues a conversation "
            "and streams the AI response as plain text."
        ),
    )
    def post(self, request):

        # -----------------------------
        # Validate request
        # -----------------------------

        serializer = ChatRequestSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        service = ChatService()

        # -----------------------------
        # Create / continue conversation
        # -----------------------------

        try:

            result = service.stream_message(
                message=data["message"],

                conversation_id=data.get(
                    "conversation_id"
                ),

                visitor_id=data.get(
                    "visitor_id"
                ),

                user=request.user,
            )

        except ConversationNotFoundError as exc:

            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except ConversationAccessDeniedError as exc:

            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except NoActiveAgentError as exc:

            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ChatServiceError as exc:

            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # -----------------------------
        # Result
        # -----------------------------

        conversation = result["conversation"]

        user_message = result["user_message"]

        agent_stream = result["stream"]

        # -----------------------------
        # Streaming generator
        # -----------------------------

        def generate():

            full_response = ""

            try:

                for chunk in agent_stream:

                    if not chunk:
                        continue

                    # Build full assistant response
                    # for database storage
                    full_response += chunk

                    # Immediately send chunk
                    # to frontend
                    yield chunk

            except AgentAPIError as exc:

                # HTTP headers have already been sent,
                # so status code cannot be changed here.
                #
                # We stop the stream.
                print(
                    f"AI Agent stream error: {exc}"
                )

                return

            except Exception as exc:

                print(
                    f"Unexpected stream error: {exc}"
                )

                return

            # -----------------------------
            # Save assistant response
            # after stream finishes
            # successfully
            # -----------------------------

            if full_response.strip():

                service.save_assistant_message(
                    conversation=conversation,
                    content=full_response,
                )

        # -----------------------------
        # Streaming HTTP Response
        # -----------------------------

        response = StreamingHttpResponse(
            streaming_content=generate(),

            content_type=(
                "text/plain; charset=utf-8"
            ),
        )

        # Prevent caching
        response["Cache-Control"] = "no-cache"

        # Prevent nginx buffering
        response["X-Accel-Buffering"] = "no"

        # -----------------------------
        # Metadata for frontend
        # -----------------------------

        response["X-Conversation-ID"] = str(
            conversation.id
        )

        response["X-User-Message-ID"] = str(
            user_message.id
        )

        if conversation.visitor_id:

            response["X-Visitor-ID"] = str(
                conversation.visitor_id
            )

        return response


# =========================================================
# Conversation List API
# =========================================================

class ConversationListAPIView(APIView):

    authentication_classes = []

    permission_classes = [
        AllowAny
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="visitor_id",

                type=OpenApiTypes.UUID,

                location=OpenApiParameter.QUERY,

                required=True,

                description="Visitor UUID",
            ),
        ],

        responses=ConversationListSerializer(
            many=True
        ),

        summary="List visitor conversations",

        description=(
            "Returns all active conversations "
            "belonging to a visitor."
        ),
    )
    def get(self, request):

        visitor_id = request.query_params.get(
            "visitor_id"
        )

        if not visitor_id:

            return Response(
                {
                    "error":
                        "visitor_id is required."
                },

                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        conversations = (
            Conversation.objects
            .filter(
                visitor_id=visitor_id,
                is_active=True,
            )
            .order_by(
                "-updated_at"
            )
        )

        serializer = ConversationListSerializer(
            conversations,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# Conversation Detail / History API
# =========================================================

class ConversationDetailAPIView(APIView):

    authentication_classes = []

    permission_classes = [
        AllowAny
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="visitor_id",

                type=OpenApiTypes.UUID,

                location=OpenApiParameter.QUERY,

                required=True,

                description="Visitor UUID",
            ),
        ],

        responses=ConversationDetailSerializer,

        summary="Get conversation history",

        description=(
            "Returns a conversation together "
            "with all stored user and assistant messages."
        ),
    )
    def get(
        self,
        request,
        conversation_id,
    ):

        visitor_id = request.query_params.get(
            "visitor_id"
        )

        if not visitor_id:

            return Response(
                {
                    "error":
                        "visitor_id is required."
                },

                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        try:

            conversation = (
                Conversation.objects
                .prefetch_related(
                    "messages"
                )
                .get(
                    id=conversation_id,

                    visitor_id=visitor_id,

                    is_active=True,
                )
            )

        except Conversation.DoesNotExist:

            return Response(
                {
                    "error":
                        "Conversation not found."
                },

                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        serializer = ConversationDetailSerializer(
            conversation
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )