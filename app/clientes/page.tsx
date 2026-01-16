"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icons } from "@/components/Icons";
import { clientSchema, ClientFormData } from "@/lib/validations";

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
}

export default function ClientesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            company: "",
            notes: "",
        }
    });

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            await loadClients();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadClients() {
        const { data } = await supabase.from("clients").select("*").order("name", { ascending: true });
        setClients(data || []);
    }

    function openCreateModal() {
        setEditingClient(null);
        reset({
            name: "",
            email: "",
            phone: "",
            company: "",
            notes: "",
        });
        setShowModal(true);
    }

    function openEditModal(client: Client) {
        setEditingClient(client);
        reset({
            name: client.name,
            email: client.email || "",
            phone: client.phone || "",
            company: client.company || "",
            notes: client.notes || "",
        });
        setShowModal(true);
    }

    async function onSubmit(data: ClientFormData) {
        const clientData = {
            name: data.name.trim(),
            email: data.email?.trim() || null,
            phone: data.phone?.trim() || null,
            company: data.company?.trim() || null,
            notes: data.notes?.trim() || null
        };

        const result = editingClient
            ? await supabase.from("clients").update(clientData).eq("id", editingClient.id)
            : await supabase.from("clients").insert(clientData);

        if (result.error) {
            alert(`Error: ${result.error.message}`);
        } else {
            setShowModal(false);
            reset();
            await loadClients();
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`¿Eliminar al cliente "${name}"? Se borrarán también sus proyectos.`)) return;
        const { error } = await supabase.from("clients").delete().eq("id", id);
        if (error) alert(`Error: ${error.message}`); else await loadClients();
    }

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={4} /></div>;

    return (
        <AppLayout
            title="Gestión de Clientes"
            subtitle="Cartera de Contactos"
            actionButton={
                <button onClick={openCreateModal} className="px-5 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-xs rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider">
                    <span className="text-base">+</span> Nuevo Cliente
                </button>
            }
        >
            {/* Search */}
            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Buscar por nombre o empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#12161F] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#3ED6D8]/50 outline-none transition-all pl-10 text-sm placeholder:text-zinc-500"
                />
                <span className="absolute left-3 top-3.5 text-zinc-500"><Icons.Search /></span>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                    <div key={client.id} className="bg-[#12161F] border border-white/10 hover:border-[#3ED6D8]/50 rounded-xl p-5 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-white group-hover:text-[#3ED6D8] transition-colors truncate">{client.name}</h3>
                                <p className="text-zinc-500 text-sm truncate">{client.company || "Persona Natural"}</p>
                            </div>
                            <div className="flex gap-1 ml-2 shrink-0">
                                <button onClick={() => openEditModal(client)} className="p-1.5 text-zinc-500 hover:text-[#3ED6D8] transition-colors"><Icons.Edit /></button>
                                <button onClick={() => handleDelete(client.id, client.name)} className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"><Icons.Trash /></button>
                            </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-zinc-400 mb-4">
                            <div className="flex items-center gap-2"><span className="text-zinc-600"><Icons.Mail /></span><span className="truncate">{client.email || "Sin correo"}</span></div>
                            <div className="flex items-center gap-2"><span className="text-zinc-600"><Icons.Phone /></span><span>{client.phone || "Sin teléfono"}</span></div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                            <Link href={`/proyectos?client_id=${client.id}`} className="text-xs bg-white/5 hover:bg-[#3ED6D8]/10 text-zinc-300 hover:text-[#3ED6D8] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border border-white/10 hover:border-[#3ED6D8]/30">
                                <Icons.Briefcase /> Ver Proyectos
                            </Link>
                            <span className={`w-2 h-2 rounded-full ${client.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} title={client.is_active ? "Activo" : "Inactivo"}></span>
                        </div>
                    </div>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-16 bg-[#12161F]/50 rounded-2xl border border-white/10 border-dashed mt-4">
                    <p className="text-zinc-500 text-lg">No se encontraron clientes.</p>
                    {clients.length === 0 && <button onClick={openCreateModal} className="mt-4 text-[#3ED6D8] hover:underline">Crea tu primer cliente ahora</button>}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        placeholder="Nombre del cliente"
                        {...register("name")}
                        error={errors.name?.message}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Correo Electrónico"
                            type="email"
                            placeholder="cliente@email.com"
                            {...register("email")}
                            error={errors.email?.message}
                        />
                        <Input
                            label="Teléfono"
                            placeholder="+57 300..."
                            {...register("phone")}
                            error={errors.phone?.message}
                        />
                    </div>
                    <Input
                        label="Empresa / Compañía"
                        placeholder="Nombre de la empresa"
                        {...register("company")}
                        error={errors.company?.message}
                    />
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notas Internas</label>
                        <textarea
                            {...register("notes")}
                            className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-[#3ED6D8] min-h-[80px] text-sm ${errors.notes ? 'border-rose-500' : 'border-white/10'}`}
                            placeholder="Detalles adicionales..."
                        />
                        {errors.notes && <p className="text-rose-400 text-[10px] mt-1">{errors.notes.message}</p>}
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowModal(false); reset(); }}>Cancelar</Button>
                        <Button type="submit" className="flex-1" isLoading={isSubmitting}>{editingClient ? 'Actualizar' : 'Crear Cliente'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
