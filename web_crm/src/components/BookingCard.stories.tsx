import type { Meta, StoryObj } from '@storybook/react';
import { BookingCard } from './BookingCard';

const meta = {
    title: 'Business/BookingCard',
    component: BookingCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        status: {
            control: 'select',
            options: ['confirmed', 'pending', 'cancelled', 'completed'],
        },
    },
} satisfies Meta<typeof BookingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
    args: {
        id: '1',
        status: 'pending',
        time: '19:00',
        date: 'Oct 24',
        tableNumber: '12',
        guestName: 'John Doe',
        guestCount: 4,
        phone: '+1 234 567 8900',
        notes: 'Birthday dinner, allergic to shell fish. Please arrange a small cake at the end.',
    },
};

export const Confirmed: Story = {
    args: {
        id: '2',
        status: 'confirmed',
        time: '20:30',
        tableNumber: '5',
        guestName: 'Jane Smith',
        guestCount: 2,
    },
};

export const Cancelled: Story = {
    args: {
        id: '3',
        status: 'cancelled',
        time: '18:00',
        date: 'Oct 25',
        tableNumber: '8',
        guestName: 'Alice Johnson',
        guestCount: 3,
    },
};

export const Completed: Story = {
    args: {
        id: '4',
        status: 'completed',
        time: '12:00',
        tableNumber: '10',
        guestName: 'Bob Williams',
        guestCount: 5,
    },
};
