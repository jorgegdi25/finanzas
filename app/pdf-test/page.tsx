"use client";

import { generateDocumentPDF } from '@/lib/pdf-generator';
import { CommercialDocument } from '@/lib/types/document';

const MOCK_QUOTE: CommercialDocument = {
    type: 'quote',
    number: 'COT-2024-001',
    date: '14 de Enero, 2024',
    client: {
        name: 'Inversiones Globales S.A.S.',
        id: '900.123.456-7',
        address: 'Calle 100 #15-30, Bogotá',
        city: 'Bogotá'
    },
    concept: 'Desarrollo de Módulo de Gestión Financiera',
    items: [
        { description: 'Diseño de Interfaz UX/UI', quantity: 1, unitPrice: 2500000, total: 2500000 },
        { description: 'Implementación de Dashboard', quantity: 1, unitPrice: 4000000, total: 4000000 },
        { description: 'Integración de API Supabase', quantity: 20, unitPrice: 150000, total: 3000000 },
    ],
    totals: {
        subtotal: 9500000,
        tax: 1805000,
        total: 11305000
    },
    conditions: [
        'Validez de la oferta: 15 días calendario.',
        'Forma de pago: 50% anticipo, 50% contra entrega.',
        'Tiempo de entrega estimado: 4 semanas.'
    ],
    issuer: {
        name: 'Jorge Gonzalez Mejia',
        id: '1.020.345.678',
        email: 'jorge@finanzas-jgm.com',
        bankInfo: 'Cuenta de Ahorros Bancolombia No. 123-456789-01',
        signatureName: 'Jorge Gonzalez M.'
    }
};

const MOCK_INVOICE: CommercialDocument = {
    type: 'invoice',
    number: 'CC-2024-005',
    date: '14 de Enero, 2024',
    client: {
        name: 'Tech Solutions Ltd',
        id: '800.987.654-3',
        address: 'Av. El Dorado #68-10, Bogotá',
    },
    concept: 'Servicios de Consultoría Técnica Diciembre 2023',
    items: [
        { description: 'Mantenimiento de Servidores', quantity: 1, unitPrice: 1200000, total: 1200000 },
        { description: 'Soporte Técnico Remoto (Horas)', quantity: 10, unitPrice: 80000, total: 800000 },
    ],
    totals: {
        subtotal: 2000000,
        total: 2000000
    },
    conditions: [
        'Favor consignar a la cuenta mencionada abajo.',
        'Esta cuenta de cobro se asimila en sus efectos a la letra de cambio (Art. 774 del Código de Comercio).'
    ],
    issuer: {
        name: 'Jorge Gonzalez Mejia',
        id: '1.020.345.678',
        bankInfo: 'Cuenta de Ahorros Bancolombia No. 123-456789-01',
    }
};

export default function PdfTestPage() {
    return (
        <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl border border-zinc-700 max-w-md w-full text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Generador de PDF</h1>
                <p className="text-zinc-400 mb-8 font-medium">Prueba la generación de documentos comerciales con diseño profesional.</p>

                <div className="space-y-4">
                    <button
                        onClick={() => generateDocumentPDF(MOCK_QUOTE)}
                        className="w-full py-4 bg-[#3ED6D8] hover:bg-[#35c1c3] text-zinc-900 font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar Cotización
                    </button>

                    <button
                        onClick={() => generateDocumentPDF(MOCK_INVOICE)}
                        className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg border border-zinc-600 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Descargar Cuenta de Cobro
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-700 text-xs text-zinc-500">
                    Estilo: Limpio, Profesional, Estilo Colombiano
                </div>
            </div>
        </div>
    );
}
