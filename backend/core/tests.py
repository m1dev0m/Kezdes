from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from core.models import Profile, PushToken


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


class RegistrationAPITest(APITestCase):
    def test_registration_success(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password2': 'newpass123',
            'role': 'customer'
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
