import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';
import { Settings, User, Bell } from 'lucide-react';
import { useState } from 'react';

const meta = {
    title: 'UI/Dropdown',
    component: Dropdown,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

const iconOptions = [
    { value: 'profile', label: 'Profile', icon: <User className="w-4 h-4 text-slate-500" /> },
    { value: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-slate-500" /> },
    { value: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4 text-slate-500" /> },
];

const longOptions = Array.from({ length: 50 }).map((_, i) => ({
    value: `opt-${i}`,
    label: `Long List Option ${i + 1}`
}));

export const Basic = () => {
    const [val, setVal] = useState<string>();
    return (
        <div className="w-64">
            <Dropdown
                options={simpleOptions}
                value={val}
                onChange={setVal}
                placeholder="Select a simple option"
            />
        </div>
    );
};

export const WithIcons = () => {
    const [val, setVal] = useState<string>();
    return (
        <div className="w-64">
            <Dropdown
                options={iconOptions}
                value={val}
                onChange={setVal}
                placeholder="Select with icon"
            />
        </div>
    );
};

export const Searchable = () => {
    const [val, setVal] = useState<string>();
    return (
        <div className="w-64">
            <Dropdown
                options={longOptions}
                value={val}
                onChange={setVal}
                searchable
                placeholder="Search 50 options..."
            />
        </div>
    );
};

export const MultipleSelect = () => {
    const [val, setVal] = useState<string[]>([]);
    return (
        <div className="w-64">
            <Dropdown
                options={simpleOptions}
                value={val}
                onChange={setVal}
                multiple
                placeholder="Select multiple"
            />
        </div>
    );
};

export const MultipleSearchable = () => {
    const [val, setVal] = useState<string[]>([]);
    return (
        <div className="w-64">
            <Dropdown
                options={longOptions}
                value={val}
                onChange={setVal}
                multiple
                searchable
                placeholder="Search and multi-select..."
            />
        </div>
    );
};
