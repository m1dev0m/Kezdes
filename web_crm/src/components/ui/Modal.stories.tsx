import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useState } from 'react';

const meta = {
    title: 'UI/Modal',
    component: Modal,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Modal>;

export default meta;

export const Basic = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Basic Modal"
            >
                <p className="text-slate-600">This is a basic modal content. You can put anything here.</p>
            </Modal>
        </>
    );
};

export const WithFooter = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>Open Modal with Footer</Button>
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Confirm Action"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsOpen(false)}>Confirm</Button>
                    </>
                }
            >
                <p className="text-slate-600">Are you sure you want to perform this action? This cannot be undone.</p>
            </Modal>
        </>
    );
};

export const DifferentSizes = () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full' | null>(null);

    return (
        <div className="flex gap-2 flex-wrap">
            {(['sm', 'md', 'lg', 'xl', 'full'] as const).map(s => (
                <Button key={s} onClick={() => setSize(s)} variant="outline">
                    Open {toupper(s)}
                </Button>
            ))}
            <Modal
                isOpen={size !== null}
                onClose={() => setSize(null)}
                title={`Size: ${size}`}
                size={size || 'md'}
            >
                <p className="text-slate-600">This modal has a size of {size}.</p>
            </Modal>
        </div>
    );
};

export const LongContent = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>Open Long Content</Button>
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Terms and Conditions"
                footer={
                    <Button onClick={() => setIsOpen(false)}>I Accept</Button>
                }
            >
                <div className="space-y-4 text-slate-600">
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in odio ac turpis lobortis faucibus.</p>
                    <p>Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec interdum id ex sed pellentesque.</p>
                    {Array.from({ length: 15 }).map((_, i) => (
                        <p key={i}>Curabitur vel lectus nec ante mattis tincidunt. Duis vitae ligula vel dolor hendrerit vestibulum nec non mi.</p>
                    ))}
                </div>
            </Modal>
        </>
    );
};

function toupper(s: string) {
    return s.toUpperCase();
}
