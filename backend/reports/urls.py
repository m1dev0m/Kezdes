from django.urls import path
from .views import BookingsExcelReportView, CustomersExcelReportView, AnalyticsExcelReportView
urlpatterns = [
    path('bookings/excel/', BookingsExcelReportView.as_view(), name='bookings_excel'),
    path('customers/excel/', CustomersExcelReportView.as_view(), name='customers_excel'),
    path('analytics/excel/', AnalyticsExcelReportView.as_view(), name='analytics_excel'),
]
