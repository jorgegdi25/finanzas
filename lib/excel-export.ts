import * as XLSX from 'xlsx';

interface ExportColumn {
    header: string;
    key: string;
    width?: number;
}

/**
 * Exporta datos a un archivo Excel (.xlsx)
 * @param data Array de objetos a exportar
 * @param columns Definición de columnas con headers
 * @param filename Nombre del archivo (sin extensión)
 * @param sheetName Nombre de la hoja
 */
export function exportToExcel<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    sheetName: string = 'Datos'
): void {
    // Crear headers
    const headers = columns.map(col => col.header);

    // Transformar datos
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            // Formatear valores especiales
            if (value === null || value === undefined) return '';
            if (typeof value === 'object' && value.name) return value.name; // Para relaciones
            return value;
        })
    );

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Configurar anchos de columna
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Descargar archivo
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exporta movimientos a Excel con formato personalizado
 */
export function exportMovements(movements: any[], filename: string = 'movimientos'): void {
    const columns: ExportColumn[] = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Tipo', key: 'type', width: 10 },
        { header: 'Categoría', key: 'categories', width: 20 },
        { header: 'Cuenta', key: 'accounts', width: 20 },
        { header: 'Monto Original', key: 'amount_original', width: 15 },
        { header: 'Moneda', key: 'currency', width: 8 },
        { header: 'Monto COP', key: 'amount_cop', width: 15 },
        { header: 'Nota', key: 'note', width: 30 },
    ];

    // Transformar datos
    const formattedData = movements.map(m => ({
        ...m,
        type: m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Gasto' : 'Transferencia',
        categories: m.categories?.name || 'Sin categoría',
        accounts: m.accounts?.name || 'Sin cuenta',
    }));

    exportToExcel(formattedData, columns, filename, 'Movimientos');
}

/**
 * Exporta cuentas a Excel
 */
export function exportAccounts(accounts: any[], filename: string = 'cuentas'): void {
    const columns: ExportColumn[] = [
        { header: 'Nombre', key: 'name', width: 25 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Moneda', key: 'currency', width: 8 },
        { header: 'Saldo Inicial', key: 'initial_balance', width: 15 },
        { header: 'Activa', key: 'is_active', width: 8 },
    ];

    const formattedData = accounts.map(a => ({
        ...a,
        type: a.type === 'bank' ? 'Banco' : a.type === 'cash' ? 'Efectivo' : 'Billetera',
        is_active: a.is_active ? 'Sí' : 'No',
    }));

    exportToExcel(formattedData, columns, filename, 'Cuentas');
}

/**
 * Exporta suscripciones a Excel
 */
export function exportSubscriptions(subscriptions: any[], filename: string = 'suscripciones'): void {
    const columns: ExportColumn[] = [
        { header: 'Nombre', key: 'name', width: 25 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Monto', key: 'amount', width: 12 },
        { header: 'Moneda', key: 'currency', width: 8 },
        { header: 'Frecuencia', key: 'frequency', width: 12 },
        { header: 'Cuenta', key: 'accounts', width: 20 },
        { header: 'Próximo Pago', key: 'next_payment_date', width: 15 },
        { header: 'Activa', key: 'is_active', width: 8 },
    ];

    const formattedData = subscriptions.map(s => ({
        ...s,
        type: s.type === 'personal' ? 'Personal' : 'Empresarial',
        frequency: s.frequency === 'monthly' ? 'Mensual' : s.frequency === 'yearly' ? 'Anual' : 'Semanal',
        accounts: s.accounts?.name || 'Sin cuenta',
        is_active: s.is_active ? 'Sí' : 'No',
    }));

    exportToExcel(formattedData, columns, filename, 'Suscripciones');
}

/**
 * Exporta deudas a Excel
 */
export function exportDebts(debts: any[], filename: string = 'deudas'): void {
    const columns: ExportColumn[] = [
        { header: 'Nombre', key: 'name', width: 25 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Saldo COP', key: 'balance_cop', width: 15 },
        { header: 'Tasa de Interés', key: 'interest_rate_value', width: 12 },
        { header: 'Pago Mínimo', key: 'minimum_payment_cop', width: 15 },
        { header: 'Cuotas Totales', key: 'total_installments', width: 12 },
        { header: 'Cuotas Pagadas', key: 'paid_installments', width: 12 },
        { header: 'Estado', key: 'status', width: 12 },
    ];

    const formattedData = debts.map(d => ({
        ...d,
        type: d.type === 'credit_card' ? 'Tarjeta Crédito' :
            d.type === 'personal_loan' ? 'Préstamo Personal' :
                d.type === 'mortgage' ? 'Hipoteca' :
                    d.type === 'car_loan' ? 'Crédito Vehículo' : 'Otro',
        interest_rate_value: `${(d.interest_rate_value * 100).toFixed(2)}%`,
        status: d.status === 'active' ? 'Activa' : d.status === 'paid' ? 'Pagada' : d.status,
    }));

    exportToExcel(formattedData, columns, filename, 'Deudas');
}
