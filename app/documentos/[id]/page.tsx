"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { generateDocumentPDF } from "@/lib/pdf-generator";
import { CommercialDocument } from "@/lib/types/document";

interface Account { id: string; name: string; }
interface Category { id: string; name: string; }

export default function DetalleDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const docId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    // Modal Pago
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState("");
    const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
    const [payAccountId, setPayAccountId] = useState("");
    const [payNote, setPayNote] = useState("");
    const [paySaving, setPaySaving] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            await loadData(user.id);
            setLoading(false);
        }
        init();
    }, [docId]);

    async function loadData(uid: string) {
        // Load Document + Client
        const { data: docData } = await supabase
            .from("documents")
            .select(`
                *,
                client:clients (*),
                project:projects (name)
            `)
            .eq("id", docId)
            .single();

        if (!docData) {
            router.push("/documentos");
            return;
        }
        setDoc(docData);

        // Load Items
        const { data: itemsData } = await supabase
            .from("document_items")
            .select("*")
            .eq("document_id", docId);
        setItems(itemsData || []);

        // Load Profile (Issuer)
        const { data: profileData } = await supabase
            .from("profile_settings")
            .select("*")
            .eq("user_id", uid)
            .single();
        setProfile(profileData);

        // Load Payments
        const { data: payData } = await supabase
            .from("document_payments")
            .select("*, account:accounts(name)")
            .eq("document_id", docId);
        setPayments(payData || []);

        // Load Accounts
        const { data: accData } = await supabase
            .from("accounts")
            .select("id, name")
            .order("name");
        setAccounts(accData || []);
    }

    async function handleAddPayment(e: React.FormEvent) {
        e.preventDefault();
        const amount = parseFloat(payAmount);
        if (!doc || !amount || amount <= 0 || !payAccountId) return;
        setPaySaving(true);

        try {
            // 1. Asegurar categoría "Cobros / Clientes"
            let { data: cat } = await supabase
                .from("categories")
                .select("id")
                .eq("name", "Cobros / Clientes")
                .eq("type", "income")
                .single();

            if (!cat) {
                const { data: newCat } = await supabase.from("categories").insert({
                    name: "Cobros / Clientes",
                    type: "income",
                    icon: "💼"
                }).select().single();
                cat = newCat;
            }

            // 2. Registrar Pago en document_payments
            const rate = doc.currency === 'COP' ? 1 : (doc.exchange_rate || 1);
            const amountCop = amount * rate;

            const { error: payErr } = await supabase.from("document_payments").insert({
                document_id: docId,
                date: payDate,
                amount_original: amount,
                currency: doc.currency,
                exchange_rate: doc.currency === 'COP' ? null : rate,
                amount_cop: amountCop,
                account_id: payAccountId,
                note: payNote
            });
            if (payErr) throw payErr;

            // 3. Crear Transacción (Income)
            const { error: txErr } = await supabase.from("transactions").insert({
                date: payDate,
                description: `Pago ${doc.number}: ${doc.concept_title}`,
                amount_cop: amountCop,
                type: 'income',
                category_id: cat?.id,
                account_id: payAccountId,
                notes: `Ref: ${doc.number}. ${payNote}`
            });
            if (txErr) throw txErr;

            // 4. Actualizar Estado Documento
            const totalPaid = payments.reduce((sum, p) => sum + p.amount_original, 0) + amount;
            let newStatus = 'partial';
            if (totalPaid >= doc.total_original) newStatus = 'paid';

            await supabase.from("documents").update({ status: newStatus }).eq("id", docId);

            // Cerrar y recargar
            setShowPayModal(false);
            setPayAmount("");
            setPayNote("");
            const { data: { user } } = await supabase.auth.getUser();
            await loadData(user!.id);
        } catch (err: any) {
            alert("Error al registrar pago: " + err.message);
        } finally {
            setPaySaving(false);
        }
    }

    const handleDownloadPDF = () => {
        if (!doc) return;
        if (!profile) {
            alert("⚠️ Primero debes configurar tus datos de emisor en la sección de 'Ajustes' para poder generar el PDF.");
            router.push("/ajustes");
            return;
        }

        try {
            const pdfDoc: CommercialDocument = {
                type: doc.type,
                number: doc.number,
                date: doc.issue_date,
                client: {
                    name: doc.client.name,
                    id: doc.client.id_number || '---',
                    address: doc.client.address,
                    phone: doc.client.phone,
                    email: doc.client.email,
                },
                concept: doc.concept_title,
                items: items.map(item => ({
                    description: item.description,
                    quantity: item.qty,
                    unitPrice: item.unit_price,
                    total: item.line_total
                })),
                totals: {
                    subtotal: doc.subtotal_original,
                    total: doc.total_original
                },
                conditions: doc.notes ? doc.notes.split('\n') : [],
                issuer: {
                    name: profile.issuer_name,
                    id: profile.issuer_id_number,
                    phone: profile.issuer_phone,
                    email: profile.issuer_email,
                    bankInfo: profile.issuer_payment_account,
                    signatureName: profile.issuer_name
                }
            };

            generateDocumentPDF(pdfDoc);
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert("No se pudo generar el PDF. Verifica que los datos del emisor y del cliente estén completos.");
        }
    };

    if (loading) return <div className="p-20 text-center text-white">Cargando detalle...</div>;

    return (
        <div className="min-h-screen bg-zinc-900 pb-20">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link href="/documentos" className="text-zinc-500 text-sm hover:text-white">← Volver al listado</Link>
                        <div className="flex items-center gap-3 mt-1">
                            <h1 className="text-3xl font-bold text-white">{doc.number}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${doc.status === 'paid' ? 'bg-green-900/40 text-green-400' :
                                doc.status === 'draft' ? 'bg-zinc-700 text-zinc-300' :
                                    'bg-blue-900/40 text-blue-400'
                                }`}>
                                {doc.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="bg-[#3ED6D8] text-zinc-900 px-6 py-2 rounded-lg font-bold hover:bg-[#35c1c3] transition-all shadow-lg flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Descargar PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Información Principal */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-zinc-800 rounded-2xl p-8 border border-zinc-700 shadow-xl">
                            <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">Detalles del Documento</h2>
                            <div className="space-y-4">
                                <div className="border-b border-zinc-700/50 pb-4">
                                    <p className="text-zinc-500 text-xs uppercase mb-1">Concepto Principal</p>
                                    <p className="text-white text-xl font-medium">{doc.concept_title}</p>
                                    {doc.concept_detail && <p className="text-zinc-400 mt-2 text-sm">{doc.concept_detail}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-8 py-2">
                                    <div>
                                        <p className="text-zinc-500 text-xs uppercase mb-1">Para el Cliente</p>
                                        <p className="text-white font-bold">{doc.client?.name}</p>
                                        <p className="text-zinc-400 text-sm">{doc.client?.id_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs uppercase mb-1">Proyecto</p>
                                        <p className="text-white font-medium">{doc.project?.name || '---'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Items */}
                            <div className="mt-8">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Descripción</th>
                                            <th className="px-4 py-2 text-center">Cant.</th>
                                            <th className="px-4 py-2 text-right">Unitario</th>
                                            <th className="px-4 py-2 text-right text-white font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-700/50">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 text-white">{item.description}</td>
                                                <td className="px-4 py-3 text-center text-zinc-400">{item.qty}</td>
                                                <td className="px-4 py-3 text-right text-zinc-400">${item.unit_price.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-white font-medium">${item.line_total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sección de Pagos (Solo para Invoices) */}
                        {doc.type === 'invoice' && (
                            <div className="bg-zinc-800 rounded-2xl p-8 border border-zinc-700 shadow-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">Pagos Recibidos</h2>
                                    <button
                                        onClick={() => {
                                            setPayAmount(String(doc.total_original - payments.reduce((sum, p) => sum + p.amount_original, 0)));
                                            setShowPayModal(true);
                                        }}
                                        className="text-xs bg-[#3ED6D8]/10 text-[#3ED6D8] border border-[#3ED6D8]/30 px-3 py-1.5 rounded-lg hover:bg-[#3ED6D8]/20 transition-all font-bold"
                                    >
                                        + Registrar Abono
                                    </button>
                                </div>

                                {payments.length === 0 ? (
                                    <p className="text-zinc-500 text-sm italic">No se han registrado pagos para esta cuenta de cobro.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {payments.map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-700/30">
                                                <div>
                                                    <p className="text-white font-medium text-sm">{p.date}</p>
                                                    <p className="text-zinc-500 text-[10px] uppercase">{p.account?.name || 'Caja'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[#3ED6D8] font-bold">
                                                        {doc.currency} ${p.amount_original.toLocaleString()}
                                                    </p>
                                                    {doc.currency !== 'COP' && (
                                                        <p className="text-zinc-500 text-[10px] italic">${p.amount_cop.toLocaleString('es-CO')} COP</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notas Legales */}
                        {doc.notes && (
                            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 italic text-zinc-400 text-sm">
                                <p className="text-zinc-500 font-bold uppercase not-italic text-[10px] mb-2">Notas y Condiciones:</p>
                                {doc.notes}
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Totales y Resumen */}
                    <div className="space-y-6">
                        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#3ED6D8]/5 rounded-full -mr-12 -mt-12"></div>
                            <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Resumen Económico</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Subtotal</span>
                                    <span>{doc.currency} ${doc.subtotal_original.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-zinc-100 font-bold border-t border-zinc-700 pt-3 text-lg">
                                    <span>TOTAL {doc.currency}</span>
                                    <span className="text-[#3ED6D8]">${doc.total_original.toLocaleString()}</span>
                                </div>
                                {doc.currency !== 'COP' && (
                                    <div className="bg-zinc-900/50 p-3 rounded-lg mt-4 border border-zinc-700/50 text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase">Valor en Pesos (TRM ${doc.exchange_rate})</p>
                                        <p className="text-white font-bold text-xl">${doc.total_cop.toLocaleString('es-CO')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700/50 space-y-4">
                            <div>
                                <p className="text-zinc-500 text-[10px] uppercase">Emitido</p>
                                <p className="text-zinc-300 font-medium">{doc.issue_date}</p>
                            </div>
                            {doc.due_date && (
                                <div>
                                    <p className="text-orange-500/80 text-[10px] uppercase">Vencimiento</p>
                                    <p className="text-zinc-300 font-medium">{doc.due_date}</p>
                                </div>
                            )}
                            {doc.valid_until && (
                                <div>
                                    <p className="text-blue-500/80 text-[10px] uppercase">Válido hasta</p>
                                    <p className="text-zinc-300 font-medium">{doc.valid_until}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal de Pago */}
                {showPayModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-zinc-800 rounded-2xl p-8 w-full max-w-md border border-zinc-700 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6">Registrar Pago</h3>
                            <form onSubmit={handleAddPayment} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Monto a Recibir ({doc.currency})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-[#3ED6D8] outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Fecha</label>
                                        <input
                                            type="date"
                                            value={payDate}
                                            onChange={(e) => setPayDate(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Cuenta Destino</label>
                                        <select
                                            value={payAccountId}
                                            onChange={(e) => setPayAccountId(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                                            required
                                        >
                                            <option value="">Selecciona...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Nota interna</label>
                                    <input
                                        type="text"
                                        value={payNote}
                                        onChange={(e) => setPayNote(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                                        placeholder="Ej: Transferencia Nequi"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPayModal(false)}
                                        className="flex-1 py-3 bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-650"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={paySaving}
                                        className="flex-[2] py-3 bg-[#3ED6D8] text-zinc-900 font-bold rounded-xl hover:bg-[#35c1c3] disabled:opacity-50"
                                    >
                                        {paySaving ? "Guardando..." : "Confirmar Pago"}
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-tighter">Esto creará automáticamente un ingreso en tus movimientos.</p>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
