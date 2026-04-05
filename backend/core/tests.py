from django.test import TestCase
from django.test import override_settings
from django.db import connection
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from django.test.utils import CaptureQueriesContext
from unittest.mock import patch
from core.models import OTPDeliveryAttempt, Profile, PushToken, OTPVerification
from restaurants.models import Restaurant, Review, Table


class ProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_profile_creation(self):
        self.assertIsNotNone(self.user.profile)
        self.assertEqual(self.user.profile.role, 'customer')

    def test_profile_default_role(self):
        self.assertEqual(self.user.profile.role, 'customer')

    def test_profile_str(self):
        self.assertEqual(str(self.user.profile), f'{self.user.username} - Гость')


class PushTokenModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='pushuser',
            email='push@example.com',
            password='pushpass123'
        )

    def test_push_token_creation(self):
        token = PushToken.objects.create(
            user=self.user,
            token='test-device-token'
        )
        self.assertEqual(token.user, self.user)
        self.assertEqual(token.token, 'test-device-token')

    def test_push_token_unique(self):
        PushToken.objects.create(
            user=self.user,
            token='unique-token'
        )
        with self.assertRaises(Exception):
            PushToken.objects.create(
                user=self.user,
                token='unique-token'
            )


class HealthCheckAPITest(APITestCase):
    def test_health_check_endpoint(self):
        response = self.client.get('/api/v1/health/live/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE])


class AuthenticationAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='authuser',
            email='auth@example.com',
            password='authpass123'
        )

    def test_login_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'auth@example.com',
            'password': 'authpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'auth@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login_response = self.client.post('/api/v1/auth/login/', {
            'username': 'auth@example.com',
            'password': 'authpass123'
        })
        refresh_token = login_response.data['refresh']
        
        response = self.client.post('/api/v1/auth/login/refresh/', {
            'refresh': refresh_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class UpdateRoleSecurityAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='roleuser',
            email='roleuser@example.com',
            password='rolepass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_user_cannot_self_assign_owner_role(self):
        self.user.profile.role = 'customer'
        self.user.profile.save(update_fields=['role'])

        response = self.client.post('/api/v1/auth/update-role/', {'role': 'owner'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.role, 'customer')


class RegistrationAPITest(APITestCase):
    def test_registration_success(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password2': 'newpass123',
            'role': 'customer',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_registration_password_mismatch(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser2',
            'email': 'newuser2@example.com',
            'password': 'pass123',
            'password2': 'pass456',
            'role': 'customer'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_invalid_email(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'bademail',
            'email': 'not-an-email',
            'password': 'newpass123',
            'password2': 'newpass123',
            'role': 'customer'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_empty_fields(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': '',
            'email': '',
            'password': '',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_duplicate_email(self):
        User.objects.create_user(
            username='existing',
            email='duplicate@example.com',
            password='pass123'
        )
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser3',
            'email': 'duplicate@example.com',
            'password': 'newpass123',
            'password2': 'newpass123',
            'role': 'customer'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OTPAuthenticationAPITest(APITestCase):
    def test_send_otp_creates_verification_record(self):
        email = 'otp-user@example.com'

        with patch('core.views.random.randint', return_value=123456), patch('core.views.send_mail') as send_mail_mock:
            response = self.client.post('/api/v1/auth/send-otp/', {'email': email})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Код отправлен на ваш email.')
        send_mail_mock.assert_called_once()
        otp = OTPVerification.objects.get(email=email)
        self.assertEqual(otp.code, '123456')
        self.assertFalse(otp.is_verified)
        self.assertEqual(OTPDeliveryAttempt.objects.get(email=email).status, OTPDeliveryAttempt.STATUS_SENT)

    def test_send_otp_returns_500_when_sender_fails(self):
        with patch('core.views.send_mail', side_effect=RuntimeError("smtp down")):
            response = self.client.post('/api/v1/auth/send-otp/', {'email': 'otp-fail@example.com'})

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['detail'], 'Не удалось отправить письмо. Проверьте настройки почты.')
        self.assertEqual(
            OTPDeliveryAttempt.objects.get(email='otp-fail@example.com').status,
            OTPDeliveryAttempt.STATUS_FAILED,
        )

    def test_send_otp_updates_existing_record(self):
        email = 'existing-otp@example.com'
        OTPVerification.objects.create(email=email, code='111111', is_verified=True)

        with patch('core.views.random.randint', return_value=654321), patch('core.views.send_mail'):
            response = self.client.post('/api/v1/auth/send-otp/', {'email': email.upper()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        otp = OTPVerification.objects.get(email=email)
        self.assertEqual(otp.code, '654321')
        self.assertFalse(otp.is_verified)

    @override_settings(REQUIRE_EMAIL_OTP=True)
    def test_registration_with_otp_enabled_accepts_valid_code(self):
        email = 'otp-register@example.com'
        OTPVerification.objects.create(email=email, code='654321')

        response = self.client.post('/api/v1/auth/register/', {
            'username': 'otp_register_user',
            'email': email,
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
            'role': 'customer',
            'otp_code': '654321',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(username='otp_register_user').exists())
        self.assertTrue(OTPVerification.objects.get(email=email).is_verified)

    @override_settings(REQUIRE_EMAIL_OTP=False)
    def test_registration_without_otp_works_in_testing(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'testing_no_otp_user',
            'email': 'testing-no-otp@example.com',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
            'role': 'customer',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='testing_no_otp_user')
        self.assertEqual(user.profile.role, 'customer')


class OTPDeliveryAttemptMonitorAPITest(APITestCase):
    def setUp(self):
        self.global_admin = User.objects.create_user(
            username='otp_global_admin',
            email='otp-global-admin@example.com',
            password='admin-pass-123',
        )
        self.global_admin.profile.role = 'global_admin'
        self.global_admin.profile.save()

        self.owner = User.objects.create_user(
            username='otp_owner',
            email='otp-owner@example.com',
            password='owner-pass-123',
        )
        self.owner.profile.role = 'owner'
        self.owner.profile.save()

    def test_non_global_admin_cannot_access_attempts(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get('/api/v1/auth/otp-delivery-attempts/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_global_admin_sees_paginated_attempts(self):
        OTPDeliveryAttempt.objects.create(
            email='first@example.com',
            status=OTPDeliveryAttempt.STATUS_FAILED,
            provider='smtp',
            error_message='smtp down',
        )
        OTPDeliveryAttempt.objects.create(
            email='second@example.com',
            status=OTPDeliveryAttempt.STATUS_SENT,
            provider='django_mail',
            metadata={'attempt': 2},
        )

        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get('/api/v1/auth/otp-delivery-attempts/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 2)

        results = response.data['results']
        self.assertEqual(results[0]['email'], 'second@example.com')
        self.assertEqual(results[0]['status'], OTPDeliveryAttempt.STATUS_SENT)
        self.assertEqual(results[0]['provider'], 'django_mail')
        self.assertIn('created_at', results[0])
        self.assertEqual(results[1]['email'], 'first@example.com')
        self.assertEqual(results[1]['error_message'], 'smtp down')

    def test_global_admin_can_filter_attempts(self):
        OTPDeliveryAttempt.objects.create(
            email='filter-one@example.com',
            status=OTPDeliveryAttempt.STATUS_FAILED,
            provider='smtp',
            error_message='first error',
        )
        OTPDeliveryAttempt.objects.create(
            email='filter-two@example.com',
            status=OTPDeliveryAttempt.STATUS_SENT,
            provider='django_mail',
        )

        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get('/api/v1/auth/otp-delivery-attempts/?status=failed')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'filter-one@example.com')
        self.assertEqual(response.data['results'][0]['status'], OTPDeliveryAttempt.STATUS_FAILED)


class UserProfileContractAPITest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='profile_owner',
            email='profile_owner@example.com',
            password='profilepass123',
        )
        self.owner.profile.role = 'owner'
        self.owner.profile.save()

        self.restaurant = Restaurant.objects.create(
            name='Profile Contract Restaurant',
            address='Main street 1',
            latitude=43.25,
            longitude=76.93,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()

    def test_me_endpoint_uses_single_query_for_linked_owner(self):
        self.client.force_authenticate(user=self.owner)

        with self.assertNumQueries(1):
            response = self.client.get('/api/v1/auth/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['restaurant'], self.restaurant.id)
        self.assertTrue(response.data['restaurant_verified'])
        self.assertFalse(response.data['restaurant_setup_required'])

    def test_me_endpoint_patch_updates_identity_and_phone(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            '/api/v1/auth/me/',
            {
                'username': 'updated_owner',
                'email': 'updated_owner@example.com',
                'first_name': 'Aidar',
                'last_name': 'Zhaksylykov',
                'phone': '+77001234567',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.owner.refresh_from_db()
        self.owner.profile.refresh_from_db()
        self.assertEqual(self.owner.username, 'updated_owner')
        self.assertEqual(self.owner.email, 'updated_owner@example.com')
        self.assertEqual(self.owner.first_name, 'Aidar')
        self.assertEqual(self.owner.last_name, 'Zhaksylykov')
        self.assertEqual(self.owner.profile.phone, '+77001234567')


class RestaurantListContractAPITest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='restaurant_owner',
            email='restaurant_owner@example.com',
            password='profilepass123',
        )
        self.owner.profile.role = 'owner'
        self.owner.profile.save()

        self.viewer = User.objects.create_user(
            username='restaurant_viewer',
            email='restaurant_viewer@example.com',
            password='profilepass123',
        )
        self.viewer.profile.role = 'customer'
        self.viewer.profile.save()

        self.restaurant = Restaurant.objects.create(
            name='Restaurant Contract',
            address='Main street 2',
            latitude=43.26,
            longitude=76.94,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
        )

        self.table = Table.objects.create(
            restaurant=self.restaurant,
            number='R-1',
            seats=4,
            is_active=True,
        )

        self.review = Review.objects.create(
            restaurant=self.restaurant,
            user=self.viewer,
            rating=5,
            comment='Great',
        )

    def test_restaurant_list_returns_nested_tables_and_reviews(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get('/api/v1/restaurants/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(queries), 6)

        payload = response.data['results'] if isinstance(response.data, dict) else response.data
        restaurant = next(item for item in payload if item['id'] == self.restaurant.id)
        self.assertEqual(len(restaurant['tables']), 1)
        self.assertEqual(len(restaurant['reviews']), 1)
        self.assertEqual(restaurant['reviews'][0]['user_name'], self.viewer.username)


class RestaurantBySlugContractAPITest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='slug_owner',
            email='slug_owner@example.com',
            password='slugpass123',
        )
        self.owner.profile.role = 'owner'
        self.owner.profile.save()

        self.unverified = Restaurant.objects.create(
            name='Slug Unverified',
            slug='slug-unverified',
            address='Hidden street 3',
            latitude=43.22,
            longitude=76.88,
            owner=self.owner,
            is_claimed=True,
            is_verified=False,
        )

    def test_by_slug_hides_unverified_from_public(self):
        response = self.client.get(f'/api/v1/restaurants/by-slug/{self.unverified.slug}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('success', response.data)
        self.assertFalse(response.data['success'])

    def test_by_slug_allows_owner_for_unverified(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f'/api/v1/restaurants/by-slug/{self.unverified.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.unverified.id)


class RestaurantSubscriptionAPITest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='subscription_owner',
            email='subscription_owner@example.com',
            password='subscription-pass-123',
        )
        self.owner.profile.role = 'owner'
        self.owner.profile.save()

        self.restaurant = Restaurant.objects.create(
            name='Subscription Restaurant',
            address='Subscription street 1',
            latitude=43.20,
            longitude=76.90,
            owner=self.owner,
            plan='none',
            payment_status='inactive',
            capacity=40,
            is_verified=True,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()
        self.client.force_authenticate(self.owner)

    def test_plan_aliases_normalize_to_new_values(self):
        self.restaurant.plan = 'starter'
        self.restaurant.save()
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.plan, 'none')

        self.restaurant.plan = 'business'
        self.restaurant.save()
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.plan, 'pro')

    def test_analytics_forbidden_without_subscription(self):
        response = self.client.get('/api/v1/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Plus or Pro', response.data['detail'])

    def test_analytics_available_for_plus_subscription(self):
        self.restaurant.plan = 'plus'
        self.restaurant.payment_status = 'active'
        self.restaurant.save(update_fields=['plan', 'payment_status'])

        response = self.client.get('/api/v1/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_table_management_available_without_subscription_until_limit(self):
        response = self.client.post('/api/v1/restaurants/tables/', {
            'name': 'T1',
            'capacity': 4,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_table_management_available_for_plus_subscription(self):
        self.restaurant.plan = 'plus'
        self.restaurant.payment_status = 'active'
        self.restaurant.save(update_fields=['plan', 'payment_status'])

        response = self.client.post('/api/v1/restaurants/tables/', {
            'name': 'T1',
            'capacity': 4,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_subscription_summary_returns_limits_usage_and_checklist(self):
        response = self.client.get('/api/v1/restaurants/subscription/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['plan'], 'none')
        self.assertEqual(response.data['limits']['tables'], 10)
        self.assertEqual(response.data['limits']['zones'], 1)
        self.assertEqual(response.data['limits']['staff'], 0)
        self.assertEqual(response.data['usage']['tables'], 0)
        self.assertEqual(response.data['subscription_state'], 'none')
        self.assertTrue(any(item['key'] == 'billing' for item in response.data['checklist']))

    def test_plus_plan_without_payment_falls_back_to_free_tier_features(self):
        self.restaurant.plan = 'plus'
        self.restaurant.payment_status = 'past_due'
        self.restaurant.save(update_fields=['plan', 'payment_status'])

        analytics_response = self.client.get('/api/v1/analytics/dashboard/')
        self.assertEqual(analytics_response.status_code, status.HTTP_403_FORBIDDEN)

        tables_response = self.client.post('/api/v1/restaurants/tables/', {
            'name': 'T1',
            'capacity': 4,
        }, format='json')
        self.assertEqual(tables_response.status_code, status.HTTP_201_CREATED, tables_response.data)

    def test_free_plan_zone_limit_is_one(self):
        first = self.client.post('/api/v1/restaurants/zones/', {'name': 'Main hall'}, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)

        second = self.client.post('/api/v1/restaurants/zones/', {'name': 'Second hall'}, format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_free_plan_staff_is_blocked(self):
        response = self.client.post('/api/v1/restaurants/staff/', {
            'username': 'host_free_plan',
            'email': 'host_free_plan@example.com',
            'password': 'StrongPass123!',
            'role': 'host',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
