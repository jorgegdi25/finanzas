"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Movimientos", href: "/movimientos", icon: "💸" },
    { label: "Cuentas", href: "/cuentas", icon: "💳" },
    { label: "Ahorros", href: "/ahorros", icon: "🏦" },
    { label: "Deudas", href: "/deudas", icon: "📉" },
    { label: "Simulador", href: "/simulador", icon: "🧮" },
    { label: "Clientes", href: "/clientes", icon: "👥" },
    { label: "Proyectos", href: "/proyectos", icon: "💼" },
    { label: "Documentos", href: "/documentos", icon: "📄" },
    { label: "Ajustes", href: "/ajustes", icon: "⚙️" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col min-h-screen sticky top-0">
            <div className="p-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Finanzas JGM</h2>
            </div>
            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                }`}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
