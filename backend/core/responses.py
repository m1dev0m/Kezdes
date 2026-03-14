from rest_framework.response import Response


def api_error(message: str, status_code: int, *, details=None):
    payload = {
        "success": False,
        "detail": message,
        "error": {
            "message": message,
            "details": details,
            "status_code": status_code,
        },
    }
    return Response(payload, status=status_code)
