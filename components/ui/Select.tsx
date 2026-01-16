import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string | number; label: string }[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`w-full bg-[#1B1F27] border border-[#2A2F3A] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#3ED6D8] transition-all appearance-none disabled:opacity-50 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                        {...props}
                    >
                        {props.placeholder && <option value="">{props.placeholder}</option>}
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        ▼
                    </div>
                </div>
                {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
