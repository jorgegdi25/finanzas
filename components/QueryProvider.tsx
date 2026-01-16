'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: 5 minutes
                        staleTime: 5 * 60 * 1000,
                        // Cache time: 10 minutes
                        gcTime: 10 * 60 * 1000,
                        // Retry once on failure
                        retry: 1,
                        // Don't refetch on window focus for better UX
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
