import React from 'react';

interface LogoProps {
    className?: string;
    onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => {
    const content = (
        <span className={`text-[#4F46E5] font-black tracking-tighter italic ${className}`} style={{ fontSize: '1.5em', lineHeight: 1 }}>
            Kezdes
        </span>
    );

    if (onClick) {
        return (
            <button onClick={onClick} className="focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded" aria-label="Go to home">
                {content}
            </button>
        );
    }

    return content;
};
