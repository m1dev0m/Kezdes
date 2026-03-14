import api from '@/services/api';
import type { Booking, BookingFilters, BookingListResponse } from '../types';

export const reservationService = {
    async getMyBookings(filters: BookingFilters): Promise<BookingListResponse> {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.page_size) params.append('page_size', String(filters.page_size));

        const res = await api.get<BookingListResponse | Booking[]>(`/bookings/my_restaurant/?${params.toString()}`);

        if ('results' in res.data) {
            return res.data;
        } else {
            return {
                count: res.data.length,
                next: null,
                previous: null,
                results: res.data
            };
        }
    },

    async updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
        const res = await api.patch<Booking>(`/bookings/${id}/`, data);
        return res.data;
    },

    async performAction(id: number, action: string): Promise<void> {
        await api.post(`/bookings/${id}/${action}/`);
    },

    async deleteBooking(id: number): Promise<void> {
        await api.delete(`/bookings/${id}/`);
    }
};
