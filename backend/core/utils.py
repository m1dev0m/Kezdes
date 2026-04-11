import openpyxl
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse


def get_user_profile(user):
    """
    Safely resolve user's profile.
    Returns None when profile is missing instead of raising.
    """
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
    """
    Resolve restaurant from user - supports both owner-linked and profile-linked relations.
    """
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
    """
    Automatically adjust column widths in an openpyxl worksheet based on content.
    """
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
    """
    Create an HTTP response with Excel file attachment.
    """
    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = f"attachment; filename={filename}"
    workbook.save(response)
    return response
