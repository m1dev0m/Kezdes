import openpyxl
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse


def get_user_profile(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    try:
        profile = user.profile
    except (AttributeError, ObjectDoesNotExist):
        return None
    if profile is None or getattr(profile, "pk", None) is None:
        return None
    return profile


def get_user_restaurant(user):
    restaurant = getattr(user, "owned_restaurant", None)
    if restaurant:
        return restaurant

    profile = get_user_profile(user)
    if not profile:
        return None
    if getattr(profile, "is_staff_member", False):
        return getattr(profile, "restaurant", None)
    return None


def auto_adjust_column_width(worksheet):
    for col in worksheet.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                cell_value_len = len(str(cell.value)) if cell.value is not None else 0
                if cell_value_len > max_length:
                    max_length = cell_value_len
            except Exception:
                pass
        worksheet.column_dimensions[column].width = max_length + 2


def create_excel_response(workbook, filename):
    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = f"attachment; filename={filename}"
    workbook.save(response)
    return response
