"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { loginSchema, LoginFormData } from "@/lib/validations";

export default function LoginPage() {
    const router = useRouter();
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema) as any,
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(data: LoginFormData) {
        setServerError("");

        // Retry logic for network issues
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

                if (authError) {
                    setServerError(authError.message);
                    break;
                } else {
                    router.push("/dashboard");
                    return;
                }
            } catch (err: any) {
                attempts++;
                if (err?.name === 'AbortError' && attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                setServerError("Error de conexión. Verifica tu internet e intenta de nuevo.");
                break;
            }
        }
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0b] p-6 lg:p-8">
            <div className="w-full max-w-[420px] flex flex-col items-center space-y-10">

                {/* Branding Section */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-[300px] flex items-center justify-center">
                        <img
                            src="/2.png"
                            alt="Logo"
                            className="max-w-full h-auto object-contain"
                        />
                    </div>
                </div>

                {/* Login Card */}
                <div className="w-full bg-[#18181b] border border-[#27272a] rounded-[2rem] p-8 md:p-10 shadow-2xl">
                    <div className="mb-8">
                        <h1 className="text-white text-3xl font-bold tracking-tight mb-2">
                            Ingresar
                        </h1>
                        <p className="text-zinc-400 text-sm">
                            Bienvenido de nuevo a tu panel
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-200 ml-1">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                {...register("email")}
                                placeholder="tu@correo.com"
                                className={`w-full px-5 py-4 bg-[#09090b] border text-white text-base rounded-2xl focus:outline-none focus:border-[#3ED6D8] focus:ring-1 focus:ring-[#3ED6D8] transition-all placeholder:text-zinc-500 ${errors.email ? 'border-red-500' : 'border-[#3f3f46]'}`}
                            />
                            {errors.email && (
                                <p className="text-red-400 text-xs ml-1 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-200 ml-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                {...register("password")}
                                placeholder="••••••••"
                                className={`w-full px-5 py-4 bg-[#09090b] border text-white text-base rounded-2xl focus:outline-none focus:border-[#3ED6D8] focus:ring-1 focus:ring-[#3ED6D8] transition-all placeholder:text-zinc-500 ${errors.password ? 'border-red-500' : 'border-[#3f3f46]'}`}
                            />
                            {errors.password && (
                                <p className="text-red-400 text-xs ml-1 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {serverError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                                <p className="text-red-400 text-sm text-center font-medium leading-relaxed">
                                    {serverError}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4.5 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-black font-extrabold text-base rounded-2xl transition-all shadow-[0_10px_20px_-5px_rgba(62,214,216,0.3)] mt-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? "CARGANDO..." : "INICIAR SESIÓN"}
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} Finanzas JGM
                    </p>
                </div>
            </div>
        </div>
    );
}
