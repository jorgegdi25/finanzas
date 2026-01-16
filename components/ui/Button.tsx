import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = "font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-[#3ED6D8] text-zinc-900 hover:bg-[#4FF0F2] hover:scale-[1.02] shadow-lg shadow-[#3ED6D8]/20 active:scale-95",
        secondary: "bg-white/10 text-white border border-white/20 hover:bg-white hover:text-black hover:border-white active:scale-95",
        ghost: "bg-transparent text-zinc-400 hover:bg-white hover:text-black active:scale-95",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white active:scale-95"
    };


    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-base"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <span className="animate-spin">⏳</span>}
            {children}
        </button>
    );
}
