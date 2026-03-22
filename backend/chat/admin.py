from django.contrib import admin
from .models import Conversation, Message

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'restaurant', 'guest', 'updated_at', 'created_at']
    list_filter = ['restaurant', 'created_at']
    search_fields = ['guest__username', 'restaurant__name']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'booking', 'restaurant', 'sender', 'timestamp', 'is_read']
    list_filter = ['is_read', 'timestamp']
    search_fields = ['content', 'sender__username']
