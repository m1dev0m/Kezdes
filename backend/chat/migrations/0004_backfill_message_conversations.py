                                         

from django.db import migrations


def forwards(apps, schema_editor):
    Conversation = apps.get_model('chat', 'Conversation')
    Message = apps.get_model('chat', 'Message')

                                                                 
               
                                                                                              
                                                                           
                                                

    qs = Message.objects.filter(conversation__isnull=True).select_related('booking', 'restaurant', 'sender')
    for msg in qs.iterator(chunk_size=500):
        restaurant_id = None
        guest_id = None

        if msg.booking_id and msg.booking and msg.booking.user_id and msg.booking.restaurant_id:
            restaurant_id = msg.booking.restaurant_id
            guest_id = msg.booking.user_id
        elif msg.restaurant_id:
            restaurant_id = msg.restaurant_id
            guest_id = msg.sender_id

        if restaurant_id and guest_id:
            conv, _ = Conversation.objects.get_or_create(restaurant_id=restaurant_id, guest_id=guest_id)
            Message.objects.filter(id=msg.id).update(conversation_id=conv.id)


def backwards(apps, schema_editor):
    Message = apps.get_model('chat', 'Message')
    Message.objects.update(conversation_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_conversation_message_conversation'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
