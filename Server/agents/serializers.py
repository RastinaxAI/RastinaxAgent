from rest_framework import serializers
from agents.models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = [
            "id",
            "role",
            "content",
            "created_at",
        ]

class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "last_message",
            "message_count",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        message = obj.messages.order_by(
            "-created_at"
        ).first()

        if not message:
            return None

        return {
            "role": message.role,
            "content": message.content,
            "created_at": message.created_at,
        }

    def get_message_count(self, obj):
        return obj.messages.count()

class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
            "messages",
        ]


class ChatRequestSerializer(serializers.Serializer):

    message = serializers.CharField(
        max_length=10000,
        allow_blank=False,
        trim_whitespace=True,
    )

    conversation_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    visitor_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class ChatResponseSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()

    visitor_id = serializers.UUIDField(
        allow_null=True,
    )

    user_message = MessageSerializer()

    assistant_message = MessageSerializer()


