import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#07090D] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-24 h-24 bg-[#3ED6D8]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <span className="text-5xl font-black text-[#3ED6D8]">404</span>
                </div>
                <h1 className="text-white text-2xl font-bold mb-3">Página no encontrada</h1>
                <p className="text-zinc-400 mb-8">
                    La página que buscas no existe o ha sido movida.
                </p>
                <Link href="/dashboard">
                    <button className="px-6 py-3 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold rounded-xl transition-all">
                        Volver al Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
}
