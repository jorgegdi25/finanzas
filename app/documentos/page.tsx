"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { SkeletonList } from "@/components/ui/Skeleton";

interface Document {
    id: string;
    type: 'quote' | 'invoice';
    number: string;
    issue_date: string;
    total_cop: number;
    status: string;
    client: { name: string };
}

export default function DocumentosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'quote' | 'invoice'>('quote');
    const [documents, setDocuments] = useState<Document[]>([]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            await loadDocuments();
            setLoading(false);
        }
        init();
    }, [router, activeTab]);

    async function loadDocuments() {
        const { data } = await supabase.from("documents").select(`id, type, number, issue_date, total_cop, status, client:clients (name)`).eq("type", activeTab).order("created_at", { ascending: false });
        setDocuments(data as any || []);
    }

    const getStatusStyle = (status: string) => {
        if (['paid', 'accepted'].includes(status)) return 'bg-emerald-500/20 text-emerald-400';
        if (['draft'].includes(status)) return 'bg-zinc-500/20 text-zinc-400';
        if (['partial'].includes(status)) return 'bg-amber-500/20 text-amber-400';
        if (['overdue'].includes(status)) return 'bg-rose-500/20 text-rose-400';
        return 'bg-blue-500/20 text-blue-400';
    };

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={3} /></div>;

    return (
        <AppLayout title="Documentos" subtitle="Cotizaciones y Cuentas de Cobro"
            actionButton={
                <Link href="/documentos/nuevo">
                    <button className="px-3 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider whitespace-nowrap">
                        <span className="text-sm">+</span> Nuevo
                    </button>
                </Link>
            }
        >
            {/* Tabs - Responsive */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div className="flex gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setActiveTab('quote')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'quote' ? 'bg-[#3ED6D8] text-[#07090D]' : 'text-zinc-400 hover:text-white'}`}>
                        Cotizaciones
                    </button>
                    <button onClick={() => setActiveTab('invoice')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'invoice' ? 'bg-[#3ED6D8] text-[#07090D]' : 'text-zinc-400 hover:text-white'}`}>
                        Cuentas
                    </button>
                </div>
                <Link href="/ajustes">
                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold rounded-lg transition-all border border-white/10">
                        ⚙️ Ajustes
                    </button>
                </Link>
            </div>

            {/* Documents */}
            <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-white/10 bg-black/20">
                    <h2 className="text-white text-xs font-bold uppercase tracking-wider">
                        {activeTab === 'quote' ? 'Mis Cotizaciones' : 'Mis Cuentas de Cobro'}
                    </h2>
                </div>

                {documents.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <div className="text-3xl mb-3">📄</div>
                        <h3 className="text-white text-base font-medium mb-2">No hay {activeTab === 'quote' ? 'cotizaciones' : 'cuentas'}</h3>
                        <p className="text-xs mb-4">Crea una nueva desde el botón superior.</p>
                        <Link href="/documentos/nuevo">
                            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg border border-white/10">
                                Crear {activeTab === 'quote' ? 'Cotización' : 'Cuenta'}
                            </button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Mobile: Cards */}
                        <div className="md:hidden divide-y divide-white/5">
                            {documents.map((doc) => (
                                <Link key={doc.id} href={`/documentos/${doc.id}`}>
                                    <div className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[#3ED6D8] font-mono font-bold text-sm">{doc.number}</p>
                                                <p className="text-white font-medium truncate">{doc.client?.name || '---'}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${getStatusStyle(doc.status)}`}>
                                                {doc.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500 text-xs">{doc.issue_date}</span>
                                            <span className="text-white font-mono font-bold">${doc.total_cop.toLocaleString('es-CO')}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-zinc-400 text-xs font-bold uppercase tracking-wider border-b border-white/10 bg-black/10">
                                        <th className="px-5 py-4">Número</th>
                                        <th className="px-5 py-4">Cliente</th>
                                        <th className="px-5 py-4">Fecha</th>
                                        <th className="px-5 py-4 text-right">Monto</th>
                                        <th className="px-5 py-4 text-center">Estado</th>
                                        <th className="px-5 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-5 py-4 font-mono text-[#3ED6D8] font-bold">{doc.number}</td>
                                            <td className="px-5 py-4 text-white font-medium">{doc.client?.name || '---'}</td>
                                            <td className="px-5 py-4 text-zinc-400 text-sm">{doc.issue_date}</td>
                                            <td className="px-5 py-4 text-white font-bold font-mono text-right">${doc.total_cop.toLocaleString('es-CO')}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(doc.status)}`}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link href={`/documentos/${doc.id}`}>
                                                    <button className="text-zinc-500 hover:text-[#3ED6D8] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all">
                                                        Ver →
                                                    </button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
