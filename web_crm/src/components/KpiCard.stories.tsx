import type { Meta, StoryObj } from '@storybook/react';
import { KpiCard } from './KpiCard';
import { Users, DollarSign, Calendar } from 'lucide-react';

const meta = {
    title: 'Business/KpiCard',
    component: KpiCard,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: 'Total Customers',
        value: '1,234',
        icon: Users,
        iconBgClassName: 'bg-blue-50 text-blue-500 border-blue-100',
    },
};

export const WithTrendUp: Story = {
    args: {
        label: 'Daily Revenue',
        value: '$4,500',
        icon: DollarSign,
        iconBgClassName: 'bg-green-50 text-green-500 border-green-100',
        trend: {
            value: '+12.5%',
            type: 'up',
        },
    },
};

export const WithTrendDown: Story = {
    args: {
        label: 'Cancellations',
        value: '12',
        icon: Calendar,
        iconBgClassName: 'bg-red-50 text-red-500 border-red-100',
        trend: {
            value: '-2.4%',
            type: 'down',
        },
    },
};

export const MiniCard: Story = {
    args: {
        label: 'Active Bookings',
        value: '48',
        icon: Calendar,
        iconBgClassName: 'bg-purple-50 text-purple-500 border-purple-100',
        mini: true,
        trend: {
            value: '+4',
            type: 'neutral',
        },
    },
    render: (args) => <div className="w-64"><KpiCard {...args} /></div>,
};
