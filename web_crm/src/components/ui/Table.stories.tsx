import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';
import type { Column } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { Edit, Trash } from 'lucide-react';
import { useState } from 'react';

const meta = {
    title: 'UI/Table',
    component: Table,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive' | 'pending';
}

const mockData: UserData[] = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', role: 'Admin', status: 'active' },
    { id: '2', name: 'Bob Jones', email: 'bob@example.com', role: 'User', status: 'inactive' },
    { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Manager', status: 'active' },
    { id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'User', status: 'pending' },
    { id: '5', name: 'Evan Davis', email: 'evan@example.com', role: 'User', status: 'active' },
];

const columns: Column<UserData>[] = [
    { key: 'name', title: 'Name', dataKey: 'name', sortable: true },
    { key: 'email', title: 'Email', dataKey: 'email', sortable: true },
    { key: 'role', title: 'Role', dataKey: 'role' },
    {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: (record) => (
            <Badge variant={record.status === 'active' ? 'success' : record.status === 'pending' ? 'warning' : 'neutral'}>
                {record.status}
            </Badge>
        )
    },
];

export const Basic = () => {
    return <Table<UserData>
        columns={columns}
        data={mockData}
        rowKey={(record) => record.id}
    />;
};

export const WithActions = () => {
    return <Table<UserData>
        columns={[
            ...columns,
            {
                key: 'actions',
                title: 'Actions',
                align: 'right',
                render: () => (
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash className="w-4 h-4" />
                        </Button>
                    </div>
                ),
            }
        ]}
        data={mockData}
        rowKey={(record) => record.id}
    />;
};

export const Selectable = () => {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    return (
        <Table<UserData>
            columns={columns}
            data={mockData}
            rowKey={(r) => r.id}
            selectedRowKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
        />
    );
};

export const WithPagination = () => {
    const [page, setPage] = useState(1);
    return (
        <Table<UserData>
            columns={columns}
            data={mockData}
            rowKey={(r) => r.id}
            pagination={{
                currentPage: page,
                totalPages: 5,
                onPageChange: setPage,
                pageSize: 5,
                totalItems: 25,
            }}
        />
    );
};

export const Loading = () => {
    return <Table<UserData>
        columns={columns}
        data={[]}
        isLoading={true}
        rowKey={(record) => record.id}
    />;
};
