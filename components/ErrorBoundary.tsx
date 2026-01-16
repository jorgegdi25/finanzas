'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-[#07090D] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-[#12161F] border border-rose-500/30 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <path d="M12 9v4" />
                                <path d="M12 17h.01" />
                            </svg>
                        </div>
                        <h2 className="text-white text-xl font-bold mb-2">Algo salió mal</h2>
                        <p className="text-zinc-400 text-sm mb-6">
                            Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
                        </p>
                        {this.state.error && (
                            <details className="text-left mb-6 bg-black/30 rounded-lg p-3 border border-white/5">
                                <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-300">
                                    Ver detalles técnicos
                                </summary>
                                <pre className="text-rose-400/80 text-[10px] mt-2 overflow-x-auto whitespace-pre-wrap break-words">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white hover:text-black text-white font-bold text-sm rounded-xl transition-all border border-white/20"
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-2.5 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-sm rounded-xl transition-all"
                            >
                                Recargar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
