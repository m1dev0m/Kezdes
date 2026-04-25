import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from bookings.engine import (
    ReservationValidator,
    TableAssigner,
    StatusMachine,
    ValidationResult,
    TRANSITIONS,
)
from bookings.models import Booking
from restaurants.models import Restaurant, Table



@pytest.fixture
def restaurant(db):
    owner = User.objects.create_user("owner_eng_v2", "o2@test.com", "pass")
    owner.profile.role = "owner"
    owner.profile.save()
    r = Restaurant.objects.create(
        name="Engine V2 Restaurant",
        address="456 Engine St",
        city="Almaty",
        owner=owner,
        is_verified=True,
        is_claimed=True,
        capacity=20,
    )
    owner.profile.restaurant = r
    owner.profile.save()
    return r


@pytest.fixture
def tables(restaurant):
    t2 = Table.objects.create(restaurant=restaurant, number="T2", seats=2, is_active=True)
    t4 = Table.objects.create(restaurant=restaurant, number="T4", seats=4, is_active=True)
    t6 = Table.objects.create(restaurant=restaurant, number="T6", seats=6, is_active=True)
    t8 = Table.objects.create(restaurant=restaurant, number="T8", seats=8, is_active=True)
    return {"t2": t2, "t4": t4, "t6": t6, "t8": t8}


@pytest.fixture
def customer(db):
    u = User.objects.create_user("customer_eng_v2", "cv2@test.com", "pass")
    u.profile.role = "customer"
    u.profile.save()
    return u


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=7)


def make_booking(restaurant, table, user, booking_date, booking_time,
                 guests=2, duration=90, status=Booking.CONFIRMED):
    b = Booking.objects.create(
        restaurant=restaurant,
        table=table,
        user=user,
        date=booking_date,
        time=booking_time,
        guests=guests,
        duration_minutes=duration,
        status=status,
    )
    b.tables.set([table])
    return b



class TestOverlapDetection:
    

    @pytest.mark.django_db
    def test_same_table_overlap_blocked(self, restaurant, tables, customer, future_date):
                make_booking(restaurant, tables["t4"], customer, future_date, time(19, 0),
                     guests=2, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2, duration_minutes=90,
            table_id=tables["t4"].id,
        )
        assert not result.is_valid
        assert any("забронирован" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_different_table_same_time_allowed(self, restaurant, tables, customer, future_date):
                make_booking(restaurant, tables["t4"], customer, future_date, time(19, 0),
                     guests=2, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2, duration_minutes=90,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_all_tables_occupied_blocked(self, restaurant, customer, future_date):
        only_table = Table.objects.create(
            restaurant=restaurant, number="ONLY", seats=4, is_active=True,
        )
        make_booking(restaurant, only_table, customer, future_date, time(19, 0),
                     guests=2, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2, duration_minutes=90,
        )
        assert not result.is_valid
        assert any("столов" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_no_overlap_adjacent(self, restaurant, tables, customer, future_date):
                make_booking(restaurant, tables["t4"], customer, future_date, time(19, 0),
                     guests=2, duration=90)  # 19:00–20:30
        result = ReservationValidator.validate(
            restaurant, future_date, time(20, 30), guests=2, duration_minutes=90,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_no_overlap_far_apart(self, restaurant, tables, customer, future_date):
                make_booking(restaurant, tables["t4"], customer, future_date, time(12, 0),
                     guests=2, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2, duration_minutes=90,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_cancelled_booking_no_block(self, restaurant, tables, customer, future_date):
        
        make_booking(restaurant, tables["t4"], customer, future_date, time(19, 0),
                     guests=2, duration=90, status=Booking.CANCELLED_BY_USER)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2, duration_minutes=90,
            table_id=tables["t4"].id,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_capacity_exceeded_when_all_tables_booked(
        self, restaurant, tables, customer, future_date
    ):
        
        make_booking(restaurant, tables["t8"], customer, future_date, time(19, 0),
                     guests=15, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=10, duration_minutes=90,
        )
        assert not result.is_valid
        assert any("вместимост" in e.lower() for e in result.errors)


class TestCapacityValidation:
    

    @pytest.mark.django_db
    def test_exceed_capacity(self, restaurant, tables, customer, future_date):
        
        make_booking(restaurant, tables["t8"], customer, future_date, time(19, 0),
                     guests=15, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=10, duration_minutes=90,
        )
        assert not result.is_valid
        assert any("вместимост" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_within_capacity(self, restaurant, tables, customer, future_date):
                existing = make_booking(restaurant, tables["t8"], customer, future_date, time(19, 0),
                                guests=10, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=5, duration_minutes=90,
            exclude_booking_id=existing.id,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_exact_capacity_boundary(self, restaurant, tables, customer, future_date):
                existing = make_booking(restaurant, tables["t8"], customer, future_date, time(19, 0),
                                guests=10, duration=90)
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=10, duration_minutes=90,
            exclude_booking_id=existing.id,
        )
        assert result.is_valid

    @pytest.mark.django_db
    def test_no_capacity_set_skips_check(self, restaurant, tables, future_date):
                restaurant.capacity = None
        restaurant.save()
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=100, duration_minutes=90,
        )
        cap_errors = [e for e in result.errors if "вместимост" in e.lower()]
        assert len(cap_errors) == 0


class TestTableExistenceValidation:
    

    @pytest.mark.django_db
    def test_table_not_found(self, restaurant, future_date):
        
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2,
            duration_minutes=90, table_id=99999,
        )
        assert not result.is_valid
        assert any("не найден" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_table_wrong_restaurant(self, restaurant, tables, future_date):
        
        other_owner = User.objects.create_user("other_owner", "other@test.com", "pass")
        other_rest = Restaurant.objects.create(
            name="Other", address="X", city="Almaty", owner=other_owner,
            is_verified=True,
        )
        other_table = Table.objects.create(
            restaurant=other_rest, number="OT1", seats=4, is_active=True,
        )
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2,
            duration_minutes=90, table_id=other_table.id,
        )
        assert not result.is_valid
        assert any("не принадлежит" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_table_inactive(self, restaurant, tables, future_date):
        
        inactive = Table.objects.create(
            restaurant=restaurant, number="T99", seats=4, is_active=False,
        )
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=2,
            duration_minutes=90, table_id=inactive.id,
        )
        assert not result.is_valid
        assert any("неактивен" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_table_insufficient_seats(self, restaurant, tables, future_date):
        
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=5,
            duration_minutes=90, table_id=tables["t2"].id,
        )
        assert not result.is_valid
        assert any("вмещает" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_table_valid(self, restaurant, tables, future_date):
        
        result = ReservationValidator.validate(
            restaurant, future_date, time(19, 0), guests=3,
            duration_minutes=90, table_id=tables["t4"].id,
        )
        assert result.is_valid


class TestPastDateValidation:
    @pytest.mark.django_db
    def test_past_date_rejected(self, restaurant, tables):
        result = ReservationValidator.validate(
            restaurant, date.today() - timedelta(days=1), time(19, 0),
            guests=2, duration_minutes=90,
        )
        assert not result.is_valid
        assert any("прошедшую дату" in e.lower() for e in result.errors)

    @pytest.mark.django_db
    def test_today_past_time_rejected(self, restaurant, tables):
        result = ReservationValidator.validate(
            restaurant, date.today(), time(0, 0), guests=2, duration_minutes=90,
        )
        assert not result.is_valid
        assert any("прошедшее время" in e.lower() for e in result.errors)


class TestValidationResult:
    def test_raise_if_invalid(self):
        r = ValidationResult(is_valid=False, errors=["err1", "err2"])
        with pytest.raises(ValidationError, match="err1.*err2"):
            r.raise_if_invalid()

    def test_no_raise_when_valid(self):
        r = ValidationResult(is_valid=True, errors=[])
        r.raise_if_invalid()  # should not raise



class TestTableAssignerSingle:
    @pytest.mark.django_db
    def test_smallest_sufficient_table(self, restaurant, tables, future_date):
                result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=3)
        assert len(result) == 1
        assert result[0].seats == 4
        assert result[0].id == tables["t4"].id

    @pytest.mark.django_db
    def test_exact_fit_table(self, restaurant, tables, future_date):
                result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=4)
        assert len(result) == 1
        assert result[0].seats == 4

    @pytest.mark.django_db
    def test_largest_guests_single_table(self, restaurant, tables, future_date):
                result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=8)
        assert len(result) == 1
        assert result[0].seats == 8

    @pytest.mark.django_db
    def test_returns_empty_when_no_tables(self, restaurant, future_date):
                result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=2)
        assert result == []


class TestTableAssignerCombination:
    @pytest.mark.django_db
    def test_combines_when_no_single_fits(self, restaurant, tables, future_date):
                result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=9)
        total = sum(t.seats for t in result)
        assert total >= 9
        assert len(result) >= 2

    @pytest.mark.django_db
    def test_combination_minimizes_waste(self, restaurant, tables, future_date):
        
        result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=5)
        assert len(result) == 1
        assert result[0].seats == 6

    @pytest.mark.django_db
    def test_returns_empty_when_insufficient_total(self, restaurant, future_date):
                Table.objects.create(restaurant=restaurant, number="T1", seats=1, is_active=True)
        result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=50)
        assert result == []


class TestTableAssignerPreferred:
    @pytest.mark.django_db
    def test_preferred_table_used(self, restaurant, tables, future_date):
                result = TableAssigner.assign(
            restaurant, future_date, time(18, 0), guests=3,
            preferred_table_id=tables["t6"].id,
        )
        assert len(result) == 1
        assert result[0].id == tables["t6"].id

    @pytest.mark.django_db
    def test_preferred_table_too_small(self, restaurant, tables, future_date):
                result = TableAssigner.assign(
            restaurant, future_date, time(18, 0), guests=5,
            preferred_table_id=tables["t2"].id,
        )
        assert result == []

    @pytest.mark.django_db
    def test_preferred_table_not_found(self, restaurant, tables, future_date):
                result = TableAssigner.assign(
            restaurant, future_date, time(18, 0), guests=2,
            preferred_table_id=99999,
        )
        assert result == []


class TestTableAssignerOccupied:
    @pytest.mark.django_db
    def test_skips_occupied_tables(self, restaurant, tables, customer, future_date):
        
        make_booking(restaurant, tables["t4"], customer, future_date, time(18, 0),
                     guests=3, duration=90)
        result = TableAssigner.assign(restaurant, future_date, time(18, 0), guests=3)
        assert len(result) == 1
        assert result[0].id == tables["t6"].id
        assert result[0].id != tables["t4"].id

    @pytest.mark.django_db
    def test_exclude_booking_id(self, restaurant, tables, customer, future_date):
        
        booking = make_booking(
            restaurant, tables["t4"], customer, future_date, time(18, 0),
            guests=3, duration=90,
        )
        result = TableAssigner.assign(
            restaurant, future_date, time(18, 0), guests=3,
            exclude_booking_id=booking.id,
        )
        assert any(t.id == tables["t4"].id for t in result)



class TestStatusMachineHappyPath:
    
    @pytest.mark.django_db
    def test_pending_to_confirmed(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        StatusMachine.transition(b, Booking.CONFIRMED)
        b.refresh_from_db()
        assert b.status == Booking.CONFIRMED

    @pytest.mark.django_db
    def test_confirmed_to_seated(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.SEATED)
        b.refresh_from_db()
        assert b.status == Booking.SEATED

    @pytest.mark.django_db
    def test_seated_to_completed(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.SEATED)
        StatusMachine.transition(b, Booking.COMPLETED)
        b.refresh_from_db()
        assert b.status == Booking.COMPLETED

    @pytest.mark.django_db
    def test_full_happy_path(self, restaurant, tables, customer, future_date):
                b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        StatusMachine.transition(b, Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.SEATED)
        StatusMachine.transition(b, Booking.COMPLETED)
        b.refresh_from_db()
        assert b.status == Booking.COMPLETED


class TestStatusMachineForbiddenTransitions:
    

    @pytest.mark.django_db
    def test_pending_to_seated_forbidden(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.SEATED)

    @pytest.mark.django_db
    def test_pending_to_completed_forbidden(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.COMPLETED)

    @pytest.mark.django_db
    def test_confirmed_to_pending_forbidden(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.PENDING)

    @pytest.mark.django_db
    def test_completed_is_terminal(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.COMPLETED)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.CONFIRMED)

    @pytest.mark.django_db
    def test_cancelled_is_terminal(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CANCELLED_BY_USER)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.CONFIRMED)

    @pytest.mark.django_db
    def test_rejected_is_terminal(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.REJECTED)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.PENDING)

    @pytest.mark.django_db
    def test_expired_is_terminal(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.EXPIRED)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.PENDING)

    @pytest.mark.django_db
    def test_no_show_is_terminal(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.NO_SHOW)
        with pytest.raises(ValidationError, match="Недопустимый переход"):
            StatusMachine.transition(b, Booking.COMPLETED)


class TestStatusMachineAlternatePaths:
    

    @pytest.mark.django_db
    def test_pending_to_rejected(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        StatusMachine.transition(b, Booking.REJECTED)
        b.refresh_from_db()
        assert b.status == Booking.REJECTED

    @pytest.mark.django_db
    def test_pending_to_cancelled(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        StatusMachine.transition(b, Booking.CANCELLED_BY_USER)
        b.refresh_from_db()
        assert b.status == Booking.CANCELLED_BY_USER

    @pytest.mark.django_db
    def test_confirmed_to_cancelled_by_user(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.CANCELLED_BY_USER)
        b.refresh_from_db()
        assert b.status == Booking.CANCELLED_BY_USER

    @pytest.mark.django_db
    def test_confirmed_to_cancelled_by_restaurant(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.CANCELLED_BY_RESTAURANT)
        b.refresh_from_db()
        assert b.status == Booking.CANCELLED_BY_RESTAURANT

    @pytest.mark.django_db
    def test_confirmed_to_no_show(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.NO_SHOW)
        b.refresh_from_db()
        assert b.status == Booking.NO_SHOW

    @pytest.mark.django_db
    def test_confirmed_to_completed_direct(self, restaurant, tables, customer, future_date):
                b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.CONFIRMED)
        StatusMachine.transition(b, Booking.COMPLETED)
        b.refresh_from_db()
        assert b.status == Booking.COMPLETED

    @pytest.mark.django_db
    def test_seated_to_no_show(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.SEATED)
        StatusMachine.transition(b, Booking.NO_SHOW)
        b.refresh_from_db()
        assert b.status == Booking.NO_SHOW

    @pytest.mark.django_db
    def test_pending_to_payment_pending(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        StatusMachine.transition(b, Booking.PAYMENT_PENDING)
        b.refresh_from_db()
        assert b.status == Booking.PAYMENT_PENDING

    @pytest.mark.django_db
    def test_payment_pending_to_confirmed(self, restaurant, tables, customer, future_date):
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PAYMENT_PENDING)
        StatusMachine.transition(b, Booking.CONFIRMED)
        b.refresh_from_db()
        assert b.status == Booking.CONFIRMED


class TestStatusMachineHelpers:
    @pytest.mark.django_db
    def test_allowed_transitions(self, restaurant, tables, customer, future_date):
        allowed = StatusMachine.allowed_transitions(Booking.PENDING)
        assert Booking.CONFIRMED in allowed
        assert Booking.REJECTED in allowed
        assert Booking.CANCELLED_BY_USER in allowed
        assert Booking.SEATED not in allowed

    @pytest.mark.django_db
    def test_is_terminal(self, restaurant, tables, customer, future_date):
        assert StatusMachine.is_terminal(Booking.COMPLETED)
        assert StatusMachine.is_terminal(Booking.CANCELLED_BY_USER)
        assert StatusMachine.is_terminal(Booking.REJECTED)
        assert StatusMachine.is_terminal(Booking.EXPIRED)
        assert StatusMachine.is_terminal(Booking.NO_SHOW)
        assert not StatusMachine.is_terminal(Booking.PENDING)
        assert not StatusMachine.is_terminal(Booking.CONFIRMED)
        assert not StatusMachine.is_terminal(Booking.SEATED)

    @pytest.mark.django_db
    def test_creates_history_record(self, restaurant, tables, customer, future_date):
        
        b = make_booking(restaurant, tables["t4"], customer, future_date,
                         time(19, 0), status=Booking.PENDING)
        assert b.history.count() == 0
        StatusMachine.transition(b, Booking.CONFIRMED, actor=customer)
        assert b.history.count() == 1
        h = b.history.first()
        assert h.from_status == Booking.PENDING
        assert h.to_status == Booking.CONFIRMED
        assert h.actor == customer


class TestStatusMachineTransitionMap:
    

    def test_all_statuses_have_transitions(self):
        for status, _ in Booking.STATUS_CHOICES:
            assert status in TRANSITIONS, f"Missing transition for status: {status}"



class TestWalkInBooking:
    

    @pytest.mark.django_db
    def test_walk_in_booking_validated(self, restaurant, tables, future_date):
        
        from bookings.services import BookingService
        BookingService.validate_booking_data(
            user=None,
            restaurant=restaurant,
            booking_date=future_date,
            start_time=time(19, 0),
            guests=2,
            duration_minutes=90,
        )

    @pytest.mark.django_db
    def test_walk_in_creates_booking(self, restaurant, tables, future_date):
        
        from bookings.services import BookingService
        booking = BookingService.create_booking(
            user=None,
            restaurant=restaurant,
            booking_date=future_date,
            start_time=time(19, 0),
            guests=2,
            duration_minutes=90,
            user_name="Walk-in Guest",
            user_phone="+77011234567",
        )
        assert booking.user is None
        assert booking.user_name == "Walk-in Guest"
        assert booking.status in (Booking.PENDING, Booking.PAYMENT_PENDING)
        assert booking.table is not None
