"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Saving {
    id: string;
    name: string;
    type: string;
    currency: string;
    is_locked: boolean;
}

interface Movement {
    id: string;
    date: string;
    direction: string;
    amount_original: number;
    currency: string;
    exchange_rate: number | null;
    amount_cop: number;
    note: string | null;
}

export default function AhorroDetallePage() {
    const router = useRouter();
    const params = useParams();
    const savingId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<Saving | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [totalCop, setTotalCop] = useState(0);

    // Create movement form
    const [showForm, setShowForm] = useState(false);
    const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
    const [formDirection, setFormDirection] = useState("deposit");
    const [formAmount, setFormAmount] = useState("");
    const [formCurrency, setFormCurrency] = useState("COP");
    const [formExchangeRate, setFormExchangeRate] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            await loadData();
            setLoading(false);
        }
        init();
    }, [router, savingId]);

    async function loadData() {
        // Get saving info
        const { data: savingData } = await supabase
            .from("savings")
            .select("id, name, type, currency, is_locked")
            .eq("id", savingId)
            .single();

        if (!savingData) {
            router.push("/ahorros");
            return;
        }

        setSaving(savingData);
        setFormCurrency(savingData.currency);

        // Get last 30 movements
        const { data: movementsData } = await supabase
            .from("savings_movements")
            .select("id, date, direction, amount_original, currency, exchange_rate, amount_cop, note")
            .eq("saving_id", savingId)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(30);

        setMovements(movementsData as Movement[] || []);

        // Calculate total
        const deposits = (movementsData || [])
            .filter((m) => m.direction === "deposit")
            .reduce((sum, m) => sum + (parseFloat(m.amount_cop) || 0), 0);
        const withdrawals = (movementsData || [])
            .filter((m) => m.direction === "withdraw")
            .reduce((sum, m) => sum + (parseFloat(m.amount_cop) || 0), 0);
        setTotalCop(deposits - withdrawals);
    }

    async function handleCreateMovement(e: React.FormEvent) {
        e.preventDefault();
        if (!saving) return;
        setFormError("");
        setFormLoading(true);

        // Validations
        if (!formDate) {
            setFormError("Fecha obligatoria");
            setFormLoading(false);
            return;
        }

        const amountOriginal = parseFloat(formAmount);
        if (isNaN(amountOriginal) || amountOriginal <= 0) {
            setFormError("Monto debe ser mayor a 0");
            setFormLoading(false);
            return;
        }

        // Check if locked and trying to withdraw
        if (saving.is_locked && formDirection === "withdraw") {
            setFormError("Este ahorro está marcado como intocable. No se puede retirar.");
            setFormLoading(false);
            return;
        }

        let exchangeRate: number | null = null;
        let amountCop: number;

        if (formCurrency === "COP") {
            amountCop = amountOriginal;
        } else {
            // USD, EUR, CRYPTO all need exchange rate
            exchangeRate = parseFloat(formExchangeRate);
            if (isNaN(exchangeRate) || exchangeRate <= 0) {
                setFormError("Tasa de cambio debe ser mayor a 0");
                setFormLoading(false);
                return;
            }
            amountCop = amountOriginal * exchangeRate;
        }

        const { error } = await supabase.from("savings_movements").insert({
            saving_id: savingId,
            date: formDate,
            direction: formDirection,
            amount_original: amountOriginal,
            currency: formCurrency,
            exchange_rate: exchangeRate,
            amount_cop: amountCop,
            note: formNote || null,
        });

        setFormLoading(false);

        if (error) {
            setFormError(error.message);
        } else {
            setFormAmount("");
            setFormExchangeRate("");
            setFormNote("");
            setShowForm(false);
            await loadData();
        }
    }

    async function handleDeleteMovement(movement: Movement) {
        const confirmed = confirm(`¿Eliminar este movimiento de ${movement.amount_cop.toLocaleString("es-CO")} COP?`);
        if (!confirmed) return;

        const { error } = await supabase
            .from("savings_movements")
            .delete()
            .eq("id", movement.id);

        if (!error) {
            await loadData();
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-900">
                <p className="text-white text-xl">Cargando...</p>
            </div>
        );
    }

    if (!saving) {
        return null;
    }

    const typeLabels: Record<string, string> = {
        cash: "Efectivo",
        bank: "Banco",
        investment: "Inversión",
        crypto: "Crypto",
    };

    return (
        <div className="min-h-screen bg-zinc-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href="/ahorros" className="text-zinc-400 text-sm hover:text-white">
                            ← Volver a Ahorros
                        </Link>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            {saving.name}
                            {saving.is_locked && <span className="text-yellow-400">🔒</span>}
                        </h1>
                        <p className="text-zinc-400">{typeLabels[saving.type]} • {saving.currency}</p>
                    </div>
                </div>

                {/* Total */}
                <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                    <p className="text-zinc-400 text-sm">Saldo Actual</p>
                    <p className={`text-3xl font-bold ${totalCop >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${totalCop.toLocaleString("es-CO")} COP
                    </p>
                </div>

                {/* Botón Agregar Movimiento */}
                <div className="mb-6">
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            + Agregar Movimiento
                        </button>
                    ) : (
                        <div className="bg-zinc-800 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Nuevo Movimiento</h2>
                            <form onSubmit={handleCreateMovement} className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Fecha *</label>
                                        <input
                                            type="date"
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                                        <select
                                            value={formDirection}
                                            onChange={(e) => setFormDirection(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        >
                                            <option value="deposit">Depósito</option>
                                            <option value="withdraw" disabled={saving.is_locked}>
                                                Retiro {saving.is_locked && "(Bloqueado)"}
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Monto *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formAmount}
                                            onChange={(e) => setFormAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Moneda</label>
                                        <select
                                            value={formCurrency}
                                            onChange={(e) => setFormCurrency(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        >
                                            <option value="COP">COP</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="CRYPTO">CRYPTO</option>
                                        </select>
                                    </div>
                                </div>

                                {formCurrency !== "COP" && (
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">
                                            Tasa de cambio (1 {formCurrency} = X COP) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formExchangeRate}
                                            onChange={(e) => setFormExchangeRate(e.target.value)}
                                            placeholder={formCurrency === "CRYPTO" ? "Valor en COP por unidad" : "Ej: 4200"}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Nota (opcional)</label>
                                    <input
                                        type="text"
                                        value={formNote}
                                        onChange={(e) => setFormNote(e.target.value)}
                                        placeholder="Descripción del movimiento"
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                    />
                                </div>

                                {formError && <p className="text-red-400 text-sm">{formError}</p>}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {formLoading ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Lista de Movimientos */}
                <div className="bg-zinc-800 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-white mb-4">Últimos Movimientos</h2>

                    {movements.length === 0 ? (
                        <p className="text-zinc-400">No hay movimientos registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {movements.map((mov) => (
                                <div
                                    key={mov.id}
                                    className="flex justify-between items-center p-3 bg-zinc-700 rounded"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${mov.direction === "deposit" ? "bg-green-600" : "bg-red-600"
                                                } text-white`}>
                                                {mov.direction === "deposit" ? "Depósito" : "Retiro"}
                                            </span>
                                            <span className="text-zinc-400 text-sm">{mov.date}</span>
                                        </div>
                                        {mov.note && <p className="text-zinc-400 text-sm mt-1">{mov.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`font-semibold ${mov.direction === "deposit" ? "text-green-400" : "text-red-400"
                                                }`}>
                                                {mov.direction === "deposit" ? "+" : "-"}
                                                ${mov.amount_cop.toLocaleString("es-CO")} COP
                                            </p>
                                            {mov.currency !== "COP" && (
                                                <p className="text-zinc-400 text-sm">
                                                    {mov.amount_original.toLocaleString()} {mov.currency}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMovement(mov)}
                                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
