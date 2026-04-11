from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from core.responses import api_error
from core.permissions import CanManageReservations
from ..models import Booking, ReservationHistory
from ..engine import StatusMachine
from ..services import BookingService
from restaurants.models import Table
from core.utils import get_user_profile
from ..serializers import BookingAdminUpdateSerializer
import logging

logger = logging.getLogger(__name__)

class BookingLifecycleMixin:
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def check_in(self, request, pk=None):
        """Mark booking as checked in (guest arrived) and transition to SEATED."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        if booking.status != Booking.CONFIRMED:
            return api_error(
                "Только подтвержденные бронирования могут быть отмечены как прибывшие.",
                status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                StatusMachine.transition(booking, Booking.SEATED, actor=request.user)
            except ValidationError as e:
                transaction.set_rollback(True)
                return api_error(str(e), status.HTTP_400_BAD_REQUEST)
            booking.is_checked_in = True
            booking.check_in_time = timezone.now()
            booking.save(update_fields=['is_checked_in', 'check_in_time'])

        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def reschedule(self, request, pk=None):
        """Reschedule booking by changing date/time/duration, re-checking capacity and reallocating tables."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        serializer = BookingAdminUpdateSerializer(
            instance=booking,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        return self._apply_schedule_update(request, booking, serializer.validated_data, event_type='reschedule')
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def confirm(self, request, pk=None):
        """PENDING → APPROVED with capacity re-check inside a transaction."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        booking, error = BookingService.confirm_booking(booking.id, actor=request.user)
        if error:
            return api_error(error, status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def reject(self, request, pk=None):
        """PENDING → REJECTED (admin rejects a pending booking)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        booking, error = BookingService.reject_booking(booking.id, actor=request.user)
        if error:
            return api_error(error, status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def cancel_by_restaurant(self, request, pk=None):
        """APPROVED → CANCELLED_BY_RESTAURANT (restaurant cancels after approval)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            StatusMachine.transition(booking, Booking.CANCELLED_BY_RESTAURANT, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def seat(self, request, pk=None):
        """APPROVED → SEATED (guest has arrived and been seated). Allows setting a table_id."""
        from ..services import BookingService

        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            
        table_id = request.data.get('table_id')
        if table_id:
            try:
                table = Table.objects.get(id=table_id, restaurant=booking.restaurant)
            except Table.DoesNotExist:
                return api_error("Указанный стол не найден.", status.HTTP_400_BAD_REQUEST)

            if table.seats < booking.guests:
                return api_error(
                    "Вместимость стола недостаточна для этой брони.",
                    status.HTTP_400_BAD_REQUEST,
                    details={"seats": table.seats, "guests": booking.guests},
                )

            available_table_ids = BookingService.get_available_table_ids(
                booking.restaurant,
                booking.date,
                booking.time,
                booking.duration_minutes,
                exclude_booking_id=booking.id,
            )
            if table.id not in available_table_ids:
                return api_error(
                    "Стол недоступен для этого времени.",
                    status.HTTP_400_BAD_REQUEST,
                    details={"table_id": table.id},
                )

            booking.table = table
            booking.save(update_fields=['table', 'updated_at'])
            booking.tables.set([table])

        try:
            StatusMachine.transition(booking, Booking.SEATED, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def complete(self, request, pk=None):
        """APPROVED/SEATED → COMPLETED (event finished successfully). Records visit in CRM."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            with transaction.atomic():
                StatusMachine.transition(booking, Booking.COMPLETED, actor=request.user)
                from crm.services import CRMService
                
                customer_phone = booking.user_phone
                if not customer_phone and booking.user:
                    profile = get_user_profile(booking.user)
                    if profile and profile.phone:
                        customer_phone = profile.phone

                if customer_phone:
                    CRMService.record_visit(
                        restaurant=booking.restaurant,
                        phone=customer_phone,
                        name=booking.user_name or (booking.user.username if booking.user else "Guest"),
                        email=booking.user.email if booking.user else None,
                        booking=booking,
                        spent_amount=booking.budget or 0,
                    )
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def no_show(self, request, pk=None):
        """APPROVED → NO_SHOW (guest didn't arrive)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            StatusMachine.transition(booking, Booking.NO_SHOW, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'], permission_classes=[CanManageReservations])
    def reassign_table(self, request, pk=None):
        """Reassign booking to a different single table (table_id required)."""
        from ..services import BookingService

        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        table_id = request.data.get('table_id')
        if not table_id:
            return api_error("table_id is required", status.HTTP_400_BAD_REQUEST)

        try:
            new_table = Table.objects.get(id=table_id, restaurant=booking.restaurant, is_active=True)
        except Table.DoesNotExist:
            return api_error("Table not found", status.HTTP_404_NOT_FOUND)

        if new_table.seats < booking.guests:
            return api_error(
                "Table capacity is insufficient for this booking",
                status.HTTP_400_BAD_REQUEST,
                details={"seats": new_table.seats, "guests": booking.guests},
            )

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(id=booking.id)

            available_table_ids = BookingService.get_available_table_ids(
                booking.restaurant,
                booking.date,
                booking.time,
                booking.duration_minutes,
                exclude_booking_id=booking.id,
            )
            if new_table.id not in available_table_ids:
                return api_error(
                    "Table is not available for this time slot",
                    status.HTTP_400_BAD_REQUEST,
                    details={"table_id": new_table.id},
                )

            old_table = booking.table
            booking.table = new_table
            booking.save(update_fields=['table', 'updated_at'])
            booking.tables.set([new_table])

            try:
                ReservationHistory.objects.create(
                    reservation=booking,
                    status=booking.status,
                    event_type='table_reassign',
                    actor=request.user,
                    from_status=booking.status,
                    to_status=booking.status,
                    from_table=old_table,
                    to_table=new_table,
                )
            except Exception:
                logger.exception("Failed to write reservation history for table reassign")

        return Response(self.get_serializer(booking).data)
