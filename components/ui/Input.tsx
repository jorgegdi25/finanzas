import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`w-full bg-[#1B1F27] border border-[#2A2F3A] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#3ED6D8] transition-all disabled:opacity-50 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                    {...props}
                />
                {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
