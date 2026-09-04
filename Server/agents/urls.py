from django.urls import path

from agents.views import (
    ChatAPIView,
    ConversationListAPIView,
    ConversationDetailAPIView,
)


urlpatterns = [
    path(
        "chat/",
        ChatAPIView.as_view(),
        name="chat",
    ),

    path(
        "conversations/",
        ConversationListAPIView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/<uuid:conversation_id>/",
         ConversationDetailAPIView.as_view(),
        name="conversation-detail",
    ),

]