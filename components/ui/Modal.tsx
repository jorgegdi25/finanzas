import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl'
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                className={`relative w-full ${sizes[size]} bg-[#1B1F27] border border-[#2A2F3A] 
                    rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col 
                    max-h-[85vh] sm:max-h-[90vh] sm:m-4
                    animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2A2F3A] shrink-0">
                    {/* Drag handle for mobile */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-600 rounded-full sm:hidden" />
                    {title && <h2 className="text-lg sm:text-xl font-bold text-white mt-2 sm:mt-0">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800"
                    >
                        ✕
                    </button>
                </div>
                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 pb-8 sm:pb-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
