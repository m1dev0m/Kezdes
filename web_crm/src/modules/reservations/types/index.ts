export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled_by_user' | 'cancelled_by_restaurant' | 'no_show';

export interface Booking {
    id: number;
    user_name: string;
    user_phone: string;
    date: string;
    time: string;
    guests: number;
    status: BookingStatus;
    status_display: string;
    special_requests: string;
    restaurant_name?: string;
    occasion?: string;
}

export interface BookingFilters {
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
}

export interface BookingListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Booking[];
}
