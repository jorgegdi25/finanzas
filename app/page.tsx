"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState("Iniciando verificación...");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      console.log("CheckAuth started");
      setStatus("Contactando Supabase...");

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log("Supabase response:", { user, authError });

        if (authError) {
          throw authError;
        }

        if (user) {
          if (isMounted) {
            setStatus("Usuario encontrado. Redirigiendo a Dashboard...");
            router.push("/dashboard");
          }
        } else {
          if (isMounted) {
            setStatus("No hay usuario. Redirigiendo a Login...");
            router.push("/login");
          }
        }
      } catch (err: any) {
        console.error("Auth check failed:", err);
        if (isMounted) {
          setError(err.message || "Error desconocido");
          setStatus("Error en verificación.");
        }
      }
    }

    checkAuth();

    return () => { isMounted = false; };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col gap-4 items-center justify-center bg-zinc-900 text-center p-4">
      <p className="text-white text-xl animate-pulse">{status}</p>
      {error && <p className="text-red-500 bg-red-900/20 p-2 rounded">{error}</p>}

      <div className="flex gap-4 mt-8">
        <Button onClick={() => router.push('/dashboard')}>
          Forzar Dashboard
        </Button>
        <Button variant="secondary" onClick={() => router.push('/login')}>
          Forzar Login
        </Button>
      </div>
    </div>
  );
}

