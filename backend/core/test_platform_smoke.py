from rest_framework import status
from rest_framework.test import APITestCase


class PlatformSmokeTests(APITestCase):
    def test_health_live_endpoint(self):
        res = self.client.get("/api/v1/health/live/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("status"), "ok")

    def test_health_ready_endpoint(self):
        res = self.client.get("/api/v1/health/ready/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("status"), "ok")
        self.assertIn("components", res.data)
        self.assertEqual(res.data["components"].get("database"), "ok")
        self.assertEqual(res.data["components"].get("cache"), "ok")

    def test_openapi_schema_contains_core_paths(self):
        res = self.client.get("/api/schema/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("paths", res.data)
        paths = res.data["paths"]
        self.assertIn("/api/v1/auth/login/", paths)
        self.assertIn("/api/v1/restaurants/", paths)
        self.assertIn("/api/v1/bookings/", paths)

