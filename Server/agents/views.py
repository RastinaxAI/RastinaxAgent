import uuid

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from agents.models import Conversation

from agents.serializers import (
    ChatRequestSerializer,
    ChatResponseSerializer,
    ConversationListSerializer,
    ConversationDetailSerializer,
)


from agents.services.chat_service import (
    ChatService,
    ChatServiceError,
    ConversationNotFoundError,
    ConversationAccessDeniedError,
    NoActiveAgentError,
)



class ChatAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=ChatRequestSerializer,
        responses={
            200: ChatResponseSerializer,
        },
        summary="Send message to AI Agent",
        description="Creates or continues a conversation with the AI Agent.",
    )
    def post(self, request):
        serializer = ChatRequestSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        service = ChatService()

        try:

            result = service.send_message(
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

        response_serializer = ChatResponseSerializer(
            result
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )

class ConversationListAPIView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="visitor_id",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Visitor UUID",
            ),
        ],
        responses=ConversationListSerializer(many=True),
        summary="List visitor conversations",
    )
    def get(self, request):

        visitor_id = request.query_params.get("visitor_id")

        if not visitor_id:
            return Response(
                {
                    "error": "visitor_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            visitor_uuid = uuid.UUID(visitor_id)
        except (TypeError, ValueError, AttributeError):
            return Response(
                {
                    "error": "visitor_id must be a valid UUID."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversations = (
            Conversation.objects
            .filter(
                visitor_id=visitor_uuid,
                is_active=True,
            )
            .order_by("-updated_at")
        )

        serializer = ConversationListSerializer(
            conversations,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

class ConversationDetailAPIView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="visitor_id",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Visitor UUID",
            ),
        ],
        responses=ConversationDetailSerializer,
        summary="Get conversation details",
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
                    "error": "visitor_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            visitor_uuid = uuid.UUID(visitor_id)
        except (TypeError, ValueError, AttributeError):
            return Response(
                {
                    "error": "visitor_id must be a valid UUID."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conversation = (
                Conversation.objects
                .prefetch_related("messages")
                .get(
                    id=conversation_id,
                    visitor_id=visitor_uuid,
                    is_active=True,
                )
            )

        except Conversation.DoesNotExist:
            return Response(
                {
                    "error": "Conversation not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ConversationDetailSerializer(
            conversation
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
from django.shortcuts import render

# Create your views here.
