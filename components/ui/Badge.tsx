import { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variants = {
        default: "bg-zinc-700 text-zinc-300",
        success: "bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30",
        warning: "bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30",
        danger: "bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30",
        info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        outline: "bg-transparent border border-zinc-600 text-zinc-400"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
