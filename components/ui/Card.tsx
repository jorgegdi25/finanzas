import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`bg-[#1B1F27] border border-[#2A2F3A] rounded-2xl shadow-xl overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`p-6 border-b border-[#2A2F3A] ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <h2 className={`text-xl font-bold text-white ${className}`}>
            {children}
        </h2>
    );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`p-6 ${className}`}>
            {children}
        </div>
    );
}
