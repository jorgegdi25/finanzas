"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/Icons";

const navItems = [
    { label: 'Dashboard', icon: <Icons.Dashboard />, href: '/dashboard' },
    { label: 'Movimientos', icon: <Icons.Calendar />, href: '/movimientos' },
    { label: 'Deudas', icon: <Icons.DollarCircle />, href: '/deudas' },
    { label: 'Cuentas', icon: <Icons.CreditCard />, href: '/cuentas' },
    { label: 'Ahorros', icon: <Icons.PiggyBank />, href: '/ahorros' },
    { label: 'Simulador', icon: <Icons.Calculator />, href: '/simulador' },
    { label: 'Clientes', icon: <Icons.Users />, href: '/clientes' },
    { label: 'Proyectos', icon: <Icons.Folder />, href: '/proyectos' },
    { label: 'Informes', icon: <Icons.FileText />, href: '/documentos' },
    { label: 'Ajustes', icon: <Icons.Settings />, href: '/ajustes' },
];


function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <>
            <div className="p-4">
                <img src="/2.png" alt="Logo" className="w-36 h-auto object-contain mx-auto" />
            </div>

            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link key={item.label} href={item.href} onClick={onNavigate}>
                            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all cursor-pointer group ${isActive ? 'bg-[#151B27] text-[#3ED6D8]' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                }`}>
                                <span className={isActive ? 'text-[#3ED6D8]' : 'text-zinc-500 group-hover:text-zinc-300'}>{item.icon}</span>
                                <span className="text-sm font-semibold">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-500 hover:text-white font-semibold text-xs uppercase tracking-wider transition-colors w-full px-3 py-2">
                    <Icons.Logout />
                    Salir
                </button>
            </div>
        </>
    );
}

export function Sidebar() {
    return (
        <aside className="hidden md:flex w-56 bg-[#0B0E14] border-r border-white/10 flex-col shrink-0">
            <SidebarContent />
        </aside>
    );
}

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    actionButton?: React.ReactNode;
}

export function AppLayout({ children, title, subtitle, actionButton }: AppLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#07090D] text-white font-sans overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0E14] border-r border-white/10 flex flex-col transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute top-4 right-4">
                    <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white p-1">
                        <Icons.Close />
                    </button>
                </div>
                <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </aside>

            <main className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden">
                {/* Header */}
                <header className="flex justify-between items-center mb-4 shrink-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white shrink-0"
                        >
                            <Icons.Menu />
                        </button>
                        <div className="min-w-0">
                            {subtitle && <p className="text-[#3ED6D8] text-[10px] md:text-xs font-bold uppercase tracking-widest">{subtitle}</p>}
                            <h1 className="text-sm md:text-xl font-bold text-white tracking-tight truncate">{title}</h1>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {actionButton}
                    </div>
                </header>



                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
