import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def mock_celery():
    
    with patch('core.tasks.send_notification_task') as mock_task:
        mock_task.delay = MagicMock(return_value=MagicMock(id='test-task-id'))
        yield mock_task


@pytest.fixture
def api_client():
    
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def db_setup(db):
    
    return db
