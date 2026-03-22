import type { Meta } from '@storybook/react';
import { Skeleton, TableSkeleton } from './Skeleton';

const meta = {
    title: 'UI/Skeleton',
    component: Skeleton,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;

export const Line = () => (
    <div className="space-y-2 w-64">
        <Skeleton variant="line" className="w-full" />
        <Skeleton variant="line" className="w-4/5" />
        <Skeleton variant="line" className="w-2/3" />
    </div>
);

export const Circle = () => (
    <div className="flex gap-4">
        <Skeleton variant="circle" className="w-12 h-12" />
        <Skeleton variant="circle" className="w-16 h-16" />
        <Skeleton variant="circle" className="w-20 h-20" />
    </div>
);

export const Card = () => (
    <div className="flex gap-4">
        <Skeleton variant="card" className="w-64" />
        <Skeleton variant="card" className="w-48" />
    </div>
);

export const Custom = () => (
    <Skeleton variant="custom" className="w-32 h-32 rounded-br-3xl rounded-tl-3xl bg-primary/20" />
);

export const TableVariant = () => (
    <div className="w-full max-w-3xl">
        <TableSkeleton rowCount={3} />
    </div>
);

export const ExampleProfile = () => (
    <div className="max-w-sm rounded-2xl border p-4 shadow-sm flex items-start gap-4">
        <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
        <div className="space-y-2 w-full pt-1">
            <Skeleton variant="line" className="w-1/2 h-3" />
            <Skeleton variant="line" className="w-full h-3" />
            <Skeleton variant="line" className="w-3/4 h-3" />
        </div>
    </div>
);
