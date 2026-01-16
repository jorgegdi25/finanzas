"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Icons } from "@/components/Icons";

interface SearchResult {
    id: string;
    type: "client" | "project" | "transaction" | "account" | "document" | "page";
    title: string;
    subtitle?: string;
    href: string;
    icon: React.ReactNode;
}

const PAGES: SearchResult[] = [
    { id: "page-dashboard", type: "page", title: "Dashboard", subtitle: "Panel principal", href: "/dashboard", icon: <Icons.Dashboard /> },
    { id: "page-movimientos", type: "page", title: "Movimientos", subtitle: "Transacciones", href: "/movimientos", icon: <Icons.Calendar /> },
    { id: "page-deudas", type: "page", title: "Deudas", subtitle: "Control de deudas", href: "/deudas", icon: <Icons.DollarCircle /> },
    { id: "page-cuentas", type: "page", title: "Cuentas", subtitle: "Bancos y billeteras", href: "/cuentas", icon: <Icons.CreditCard /> },
    { id: "page-ahorros", type: "page", title: "Ahorros", subtitle: "Fondos de ahorro", href: "/ahorros", icon: <Icons.PiggyBank /> },
    { id: "page-simulador", type: "page", title: "Simulador", subtitle: "Proyección de deudas", href: "/simulador", icon: <Icons.Calculator /> },
    { id: "page-clientes", type: "page", title: "Clientes", subtitle: "Gestión de clientes", href: "/clientes", icon: <Icons.Users /> },
    { id: "page-proyectos", type: "page", title: "Proyectos", subtitle: "Proyectos activos", href: "/proyectos", icon: <Icons.Folder /> },
    { id: "page-documentos", type: "page", title: "Informes", subtitle: "Cotizaciones y facturas", href: "/documentos", icon: <Icons.FileText /> },
    { id: "page-ajustes", type: "page", title: "Ajustes", subtitle: "Configuración", href: "/ajustes", icon: <Icons.Settings /> },
];

export function GlobalSearch() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery("");
            setResults(PAGES);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search function
    const search = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults(PAGES);
            return;
        }

        setLoading(true);
        const searchTerm = q.toLowerCase();

        // Filter pages
        const pageResults = PAGES.filter(
            (p) => p.title.toLowerCase().includes(searchTerm) || p.subtitle?.toLowerCase().includes(searchTerm)
        );

        // Search in database
        const [clientsRes, projectsRes, accountsRes] = await Promise.all([
            supabase.from("clients").select("id, name, company").ilike("name", `%${q}%`).limit(5),
            supabase.from("projects").select("id, name, clients(name)").ilike("name", `%${q}%`).limit(5),
            supabase.from("accounts").select("id, name, type").ilike("name", `%${q}%`).limit(5),
        ]);

        const dbResults: SearchResult[] = [];

        (clientsRes.data || []).forEach((c: any) => {
            dbResults.push({
                id: `client-${c.id}`,
                type: "client",
                title: c.name,
                subtitle: c.company || "Cliente",
                href: "/clientes",
                icon: <Icons.Users />,
            });
        });

        (projectsRes.data || []).forEach((p: any) => {
            dbResults.push({
                id: `project-${p.id}`,
                type: "project",
                title: p.name,
                subtitle: p.clients?.name || "Proyecto",
                href: "/proyectos",
                icon: <Icons.Folder />,
            });
        });

        (accountsRes.data || []).forEach((a: any) => {
            dbResults.push({
                id: `account-${a.id}`,
                type: "account",
                title: a.name,
                subtitle: a.type === "bank" ? "Banco" : a.type === "cash" ? "Efectivo" : "Billetera",
                href: "/cuentas",
                icon: <Icons.CreditCard />,
            });
        });

        setResults([...pageResults, ...dbResults]);
        setSelectedIndex(0);
        setLoading(false);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => search(query), 200);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Navigate on selection
    const handleSelect = (result: SearchResult) => {
        router.push(result.href);
        setIsOpen(false);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-[#0B0E14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                    <span className="text-zinc-500"><Icons.Search /></span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar en toda la app..."
                        className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-500"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 bg-white/5 rounded border border-white/10">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-500">Buscando...</div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">No se encontraron resultados</div>
                    ) : (
                        <div className="py-2">
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                        ? "bg-[#3ED6D8]/10 text-white"
                                        : "text-zinc-300 hover:bg-white/5"
                                        }`}
                                >
                                    <span className={index === selectedIndex ? "text-[#3ED6D8]" : "text-zinc-500"}>
                                        {result.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{result.title}</p>
                                        {result.subtitle && (
                                            <p className="text-sm text-zinc-500 truncate">{result.subtitle}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                                        {result.type === "page" ? "Página" : result.type === "client" ? "Cliente" : result.type === "project" ? "Proyecto" : "Cuenta"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/10 bg-black/30 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>↑↓ Navegar</span>
                    <span>↵ Seleccionar</span>
                    <span>ESC Cerrar</span>
                </div>
            </div>
        </div>
    );
}
