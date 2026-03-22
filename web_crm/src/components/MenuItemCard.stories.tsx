import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemCard } from './MenuItemCard';

const meta = {
    title: 'Business/MenuItemCard',
    component: MenuItemCard,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        inStock: {
            control: 'boolean',
        },
    },
} satisfies Meta<typeof MenuItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
    args: {
        id: 'item-1',
        name: 'Grilled Salmon with Asparagus',
        price: 24.50,
        category: 'Main Course',
        inStock: true,
        imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=600&auto=format&fit=crop',
    },
    render: (args) => (
        <div className="w-72">
            <MenuItemCard {...args} />
        </div>
    ),
};

export const WithoutImage: Story = {
    args: {
        id: 'item-2',
        name: 'Classic Caesar Salad',
        price: 12.00,
        category: 'Starters',
        inStock: true,
    },
    render: (args) => (
        <div className="w-72">
            <MenuItemCard {...args} />
        </div>
    ),
};

export const OutOfStock: Story = {
    args: {
        id: 'item-3',
        name: 'Truffle Mushroom Risotto',
        price: 22.00,
        category: 'Main Course',
        inStock: false,
        imageUrl: 'https://images.unsplash.com/photo-1476124369491-e4cb9907b45e?q=80&w=600&auto=format&fit=crop',
    },
    render: (args) => (
        <div className="w-72">
            <MenuItemCard {...args} />
        </div>
    ),
};
