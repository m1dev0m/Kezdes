export interface DashboardStats {
    bookings_today: number;
    bookings_tomorrow?: number;
    pending_bookings_today?: number;
    bookings_month: number;
    upcoming_bookings: number;
    occupied_tables: number;
    available_tables: number;
    active_tables?: number;
    revenue: number;
    occupancy_percent: number;
    confirmation_rate: number;
    repeat_customer_rate: number;
    avg_guests: number;
    new_requests?: number;
    weekly_chart: { name: string; total: number }[];
    daily_load: { name: string; bookings: number }[];
    popular_slots?: { time: string; count: number }[];
}

export interface AnalyticsService {
    getDashboardStats(): Promise<DashboardStats>;
    getRevenueReport(range: string): Promise<any>;
}
