import requests


def main():
    login_url = 'http://127.0.0.1:8000/api/v1/auth/login/'
    login_res = requests.post(login_url, json={"username": "testadmin2", "password": "pwd"})
    if login_res.status_code != 200:
        raise SystemExit(1)
    token = login_res.json().get('access')
    url = 'http://127.0.0.1:8000/api/v1/restaurants/'
    data = {
        "name": "Validation Test",
        "address": "123",
        "capacity": 100,
        "average_price": 5000,
        "latitude": 43.2389,
        "longitude": 76.8897,
        "phone": "+777",
        "description": "test"
    }
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    res = requests.post(url, json=data, headers=headers)


if __name__ == "__main__":
    main()
