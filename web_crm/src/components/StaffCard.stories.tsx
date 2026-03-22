import type { Meta, StoryObj } from '@storybook/react';
import { StaffCard } from './StaffCard';

const meta = {
    title: 'Business/StaffCard',
    component: StaffCard,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        status: {
            control: 'radio',
            options: ['active', 'inactive'],
        },
        role: {
            control: 'select',
            options: ['Admin', 'Manager', 'Chef', 'Waiter', 'Hostess'],
        },
    },
} satisfies Meta<typeof StaffCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveStaff: Story = {
    args: {
        id: 'staff-1',
        name: 'Sarah Connor',
        role: 'Manager',
        status: 'active',
        email: 'sarah.c@example.com',
        phone: '+1 555-0123',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    },
    render: (args) => <div className="max-w-[240px]"><StaffCard {...args} /></div>,
};

export const InactiveStaff: Story = {
    args: {
        id: 'staff-2',
        name: 'John Smith',
        role: 'Waiter',
        status: 'inactive',
        email: 'john.s@example.com',
        phone: '+1 555-9876',
    },
    render: (args) => <div className="max-w-[240px]"><StaffCard {...args} /></div>,
};
