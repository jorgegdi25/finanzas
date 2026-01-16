"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { runSimulation, DebtForSimulation, SimulationResult } from "@/lib/debt-simulator";
import { AppLayout } from "@/components/AppLayout";
import { Icons } from "@/components/Icons";
import { SkeletonDashboard } from "@/components/ui/Skeleton";


export default function SimuladorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeDebts, setActiveDebts] = useState<DebtForSimulation[]>([]);
    const [extraBudget, setExtraBudget] = useState("0");
    const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball");
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [comparison, setComparison] = useState<{ snowball: { months: number; totalInterest: number }; avalanche: { months: number; totalInterest: number }; } | null>(null);
    const [showTable, setShowTable] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            await loadDebts();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadDebts() {
        const { data } = await supabase.from("debts").select("*").eq("status", "active").order("created_at", { ascending: true });
        const debts = data as any[];
        const validDebts: DebtForSimulation[] = [];
        const newWarnings: string[] = [];

        debts?.forEach((d) => {
            if (d.interest_rate_value === null || d.minimum_payment_cop === null) { newWarnings.push(`"${d.name}" excluida: falta tasa o pago mínimo.`); return; }
            let monthlyRate: number = d.interest_rate_type === "EA" ? Math.pow(1 + d.interest_rate_value, 1 / 12) - 1 : d.interest_rate_value;
            const firstMonthInterest = d.balance_cop * monthlyRate;
            if (d.minimum_payment_cop <= firstMonthInterest) newWarnings.push(`"${d.name}": pago mínimo no cubre intereses.`);
            if (d.interest_rate_value > 1) newWarnings.push(`"${d.name}": tasa ${(d.interest_rate_value * 100).toFixed(0)}% inusualmente alta.`);
            validDebts.push({ id: d.id, name: d.name, balance_cop: d.balance_cop, interest_rate_value: d.interest_rate_value, interest_rate_type: d.interest_rate_type, minimum_payment_cop: d.minimum_payment_cop, total_installments: d.total_installments, paid_installments: d.paid_installments });
        });
        setActiveDebts(validDebts);
        setWarnings(newWarnings);
    }

    function handleSimulate() {
        if (activeDebts.length === 0) return;
        const res = runSimulation(activeDebts, parseFloat(extraBudget) || 0, strategy, startDate);
        setResult(res);
    }

    function handleCompare() {
        if (activeDebts.length === 0) return;
        const budget = parseFloat(extraBudget) || 0;
        const resSnowball = runSimulation(activeDebts, budget, "snowball", startDate);
        const resAvalanche = runSimulation(activeDebts, budget, "avalanche", startDate);
        setComparison({ snowball: { months: resSnowball.months, totalInterest: resSnowball.totalInterest }, avalanche: { months: resAvalanche.months, totalInterest: resAvalanche.totalInterest } });
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonDashboard /></div>;

    return (
        <AppLayout title="Simulador de Deudas" subtitle="Estrategia de Pago">
            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="mb-4 bg-amber-900/20 border border-amber-900/50 p-4 rounded-xl">
                    <h3 className="text-amber-400 font-bold mb-2 text-sm">⚠️ Avisos:</h3>
                    <ul className="list-disc list-inside text-amber-200/80 text-xs space-y-1">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                {/* Controls */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-[#12161F] border border-white/10 p-5 rounded-xl">
                        <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Configuración</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Presupuesto Extra (Mensual)</label>
                                <input type="number" value={extraBudget} onChange={(e) => setExtraBudget(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#3ED6D8]/50 outline-none text-sm" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Estrategia</label>
                                <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white outline-none text-sm">
                                    <option value="snowball">Bola de Nieve (Menor saldo)</option>
                                    <option value="avalanche">Avalancha (Mayor interés)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Fecha de Inicio</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white outline-none text-sm" />
                            </div>
                            <div className="pt-2 flex flex-col gap-2">
                                <button onClick={handleSimulate} className="w-full bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold py-3 rounded-lg transition-colors text-sm">Calcular Proyección</button>
                                <button onClick={handleCompare} className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-2 rounded-lg transition-colors border border-white/10 text-sm">Comparar Estrategias</button>
                            </div>
                        </div>
                    </div>

                    {comparison && (
                        <div className="bg-[#12161F] border border-white/10 p-5 rounded-xl">
                            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4 text-center">Comparativa</h3>
                            <div className="space-y-3">
                                <div className={`p-3 rounded-lg ${strategy === 'snowball' ? 'bg-[#3ED6D8]/10 ring-1 ring-[#3ED6D8]/50' : 'bg-black/20'}`}>
                                    <p className="text-blue-400 font-bold text-sm">Bola de Nieve</p>
                                    <div className="flex justify-between mt-1"><span className="text-zinc-500 text-xs">Tiempo:</span><span className="text-white text-xs font-mono">{comparison.snowball.months} meses</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500 text-xs">Intereses:</span><span className="text-white text-xs font-mono">${comparison.snowball.totalInterest.toLocaleString('es-CO')}</span></div>
                                </div>
                                <div className={`p-3 rounded-lg ${strategy === 'avalanche' ? 'bg-[#3ED6D8]/10 ring-1 ring-[#3ED6D8]/50' : 'bg-black/20'}`}>
                                    <p className="text-emerald-400 font-bold text-sm">Avalancha</p>
                                    <div className="flex justify-between mt-1"><span className="text-zinc-500 text-xs">Tiempo:</span><span className="text-white text-xs font-mono">{comparison.avalanche.months} meses</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500 text-xs">Intereses:</span><span className="text-white text-xs font-mono">${comparison.avalanche.totalInterest.toLocaleString('es-CO')}</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="md:col-span-2 space-y-4 flex flex-col">
                    {activeDebts.length === 0 ? (
                        <div className="bg-[#12161F] flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-rose-900/30 p-10 text-center">
                            <div className="w-16 h-16 bg-rose-900/20 rounded-full flex items-center justify-center mb-4 text-rose-400"><Icons.AlertTriangle /></div>
                            <h3 className="text-white text-xl font-medium">Sin deudas activas</h3>
                            <p className="text-zinc-500 mt-2 max-w-xs">Registra deudas en estado "Activo" para usar el simulador.</p>
                            <Link href="/deudas" className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10">Ir a Deudas</Link>
                        </div>
                    ) : !result ? (
                        <div className="bg-[#12161F] flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-10 text-center">
                            <div className="w-16 h-16 bg-[#3ED6D8]/10 rounded-full flex items-center justify-center mb-4 text-[#3ED6D8]"><Icons.ChartBar /></div>
                            <h3 className="text-white text-xl font-medium">Listo para simular</h3>
                            <p className="text-zinc-500 mt-2 max-w-xs">Configura tu presupuesto extra y calcula tu camino a la libertad financiera.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`p-5 rounded-xl border ${result.isPayable ? 'bg-[#12161F] border-white/10' : 'bg-rose-900/20 border-rose-700'}`}>
                                    <p className={`${result.isPayable ? 'text-zinc-400' : 'text-rose-400'} text-xs uppercase tracking-widest font-bold`}>Tiempo Total</p>
                                    <p className="text-4xl font-black text-white mt-2">{result.isPayable ? result.months : '∞'}<span className="text-lg font-normal text-zinc-500 ml-1">{result.isPayable ? 'meses' : ''}</span></p>
                                    <div className="mt-2 text-sm text-zinc-400">
                                        {result.isPayable ? <>Fin: <span className="font-mono font-bold ml-1 text-emerald-400">{result.finalDate.substring(0, 7)}</span></> : <span className="text-rose-400 font-bold">No se saldará bajo estas condiciones</span>}
                                    </div>
                                </div>
                                <div className="bg-[#12161F] p-5 rounded-xl border border-white/10">
                                    <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Intereses Totales</p>
                                    <p className="text-4xl font-black text-[#F2A08F] mt-2">${result.totalInterest.toLocaleString('es-CO')}</p>
                                    <p className="text-zinc-500 text-sm mt-2">A lo largo de {result.months} meses</p>
                                </div>
                            </div>

                            {/* Detail Table */}
                            <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col">
                                <div className="p-4 bg-black/20 flex justify-between items-center border-b border-white/10">
                                    <h3 className="text-white text-sm font-bold uppercase tracking-wider">Desglose Mensual</h3>
                                    <button onClick={() => setShowTable(!showTable)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-zinc-300 transition-colors border border-white/10">
                                        {showTable ? 'Ocultar' : 'Ver Detalle'}
                                    </button>
                                </div>
                                {showTable ? (
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-black/30 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                                                    <th className="px-4 py-3">Mes</th>
                                                    <th className="px-4 py-3">Deuda</th>
                                                    <th className="px-4 py-3 text-right">Pago</th>
                                                    <th className="px-4 py-3 text-right">Interés</th>
                                                    <th className="px-4 py-3 text-right">Capital</th>
                                                    <th className="px-4 py-3 text-right">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {result.details.map((month) => month.entries.map((entry, idx) => (
                                                    <tr key={`${month.date}-${idx}`} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{idx === 0 ? month.date : ''}</td>
                                                        <td className="px-4 py-2 font-medium text-white">{entry.debtName}</td>
                                                        <td className="px-4 py-2 text-right text-emerald-400">${entry.payment.toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-2 text-right text-rose-400/60 text-xs">${entry.interest.toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-2 text-right text-zinc-400">${entry.principal.toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-white">${entry.remainingBalance.toLocaleString('es-CO')}</td>
                                                    </tr>
                                                )))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-zinc-500 text-sm">La tabla contiene {result.details.length} meses de proyecciones.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
