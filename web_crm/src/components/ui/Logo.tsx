import React, { useState } from 'react';

interface LogoProps {
    className?: string;
    variant?: 'wordmark' | 'client' | 'admin' | 'text';
    onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'wordmark', onClick }) => {
    const isText = variant === 'text';
    const imageVariant = variant === 'wordmark' ? 'client' : variant;
    const src = imageVariant === 'admin' ? '/Kezdes_admin_Logo.jpg' : '/Kezdes_client_logo.png';
    const alt = imageVariant === 'admin' ? 'Kezdes CRM' : 'Kezdes';
    const [imageOk, setImageOk] = useState(true);

    const content = isText || !imageOk ? (
        <span className={`text-[#1d4ed8] font-black tracking-tighter ${className}`} style={{ fontSize: '1.5em', lineHeight: 1 }}>
            Kezdes
        </span>
    ) : (
        <img
            src={src}
            alt={alt}
            className={`h-7 w-auto object-contain select-none ${className}`}
            draggable={false}
            loading="eager"
            decoding="async"
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
