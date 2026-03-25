from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Normalize DRF error responses for frontend/mobile consistency.
    Keeps HTTP status code from DRF, wraps payload into a stable envelope.
    """
    response = exception_handler(exc, context)
    if response is None:
        return response

    message = "Request failed"
    details = response.data

    if isinstance(response.data, dict):
        if "detail" in response.data:
            message = str(response.data.get("detail"))
        elif "non_field_errors" in response.data and response.data["non_field_errors"]:
            first_err = response.data["non_field_errors"][0]
            message = str(first_err)
        elif response.data:
            first_key = next(iter(response.data))
            first_value = response.data[first_key]
            if isinstance(first_value, list) and first_value:
                message = str(first_value[0])
            else:
                message = str(first_value)

    response.data = {
        "success": False,
        "detail": message,
        "errors": details if isinstance(details, dict) else {},
        "error": {
            "message": message,
            "details": details,
            "status_code": response.status_code,
        },
    }
    return response
