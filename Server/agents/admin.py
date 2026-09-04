from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import Agent, Conversation, Message


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "slug",
    )

    list_filter = (
        "is_active",
    )


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "agent",
        "user",
        "visitor_id",
        "is_active",
        "created_at",
    )

    list_filter = (
        "agent",
        "is_active",
        "created_at",
    )

    search_fields = (
        "id",
        "visitor_id",
        "title",
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "role",
        "created_at",
    )

    list_filter = (
        "role",
        "created_at",
    )

    search_fields = (
        "content",
    )