import React, { useState } from 'react';

interface LogoProps {
    className?: string;
    variant?: 'wordmark' | 'admin' | 'text';
    onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'wordmark', onClick }) => {
    const isText = variant === 'text';
    const src = variant === 'admin' ? '/Kezdes_admin_Logo.jpg' : '/Kezdes_client_logo.jpg';
    const [imageOk, setImageOk] = useState(true);

    const content = isText || !imageOk ? (
        <span className={`text-brand-green font-black tracking-tighter ${className}`} style={{ fontSize: '1.5em', lineHeight: 1 }}>
            Kezdes
        </span>
    ) : (
        <img
            src={src}
            alt="Kezdes"
            className={`h-7 w-auto object-contain select-none ${className}`}
            draggable={false}
            onError={(e) => {
                e.preventDefault();
                setImageOk(false);
            }}
        />
    );

    if (onClick) {
        return (
            <button onClick={onClick} className="focus:outline-none focus:ring-2 focus:ring-gold/30 focus:ring-offset-2 rounded" aria-label="Go to home">
                {content}
            </button>
        );
    }

    return content;
};
