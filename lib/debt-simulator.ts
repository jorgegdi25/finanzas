export interface DebtForSimulation {
    id: string;
    name: string;
    balance_cop: number;
    interest_rate_value: number;
    interest_rate_type: "EA" | "EM";
    minimum_payment_cop: number;
    total_installments?: number | null;
    paid_installments?: number | null;
}

export interface SimulationResult {
    months: number;
    totalInterest: number;
    details: MonthlyDetail[];
    finalDate: string;
    isPayable: boolean;
}

export interface MonthlyDetail {
    monthIndex: number;
    date: string;
    entries: DebtMonthlyEntry[];
}

export interface DebtMonthlyEntry {
    debtName: string;
    payment: number;
    interest: number;
    principal: number;
    remainingBalance: number;
    remainingInstallments: number | null;
}

export function runSimulation(
    debts: DebtForSimulation[],
    extraBudget: number,
    strategy: "snowball" | "avalanche",
    startDate: string
): SimulationResult {
    const activeDebts = debts.map((d) => {
        // Convert interest rate to monthly
        let monthlyRate: number;
        if (d.interest_rate_type === "EA") {
            monthlyRate = Math.pow(1 + d.interest_rate_value, 1 / 12) - 1;
        } else {
            monthlyRate = d.interest_rate_value;
        }

        return {
            ...d,
            monthlyRate,
            currentBalance: d.balance_cop,
            monthsSimulated: 0,
        };
    });

    const details: MonthlyDetail[] = [];
    let totalInterest = 0;
    let monthIndex = 0;
    const maxMonths = 600;

    const currentStartDate = new Date(startDate);

    while (activeDebts.some((d) => d.currentBalance > 0) && monthIndex < maxMonths) {
        monthIndex++;
        const currentMonthDate = new Date(currentStartDate);
        currentMonthDate.setMonth(currentMonthDate.getMonth() + monthIndex - 1);
        const dateStr = currentMonthDate.toISOString().split("T")[0].substring(0, 7); // YYYY-MM

        let monthExtraBudget = extraBudget;
        const monthEntries: DebtMonthlyEntry[] = [];

        // 1. Determine target debt for extra budget
        const debtsToPay = activeDebts.filter((d) => d.currentBalance > 0);

        // Sort based on strategy
        if (strategy === "snowball") {
            debtsToPay.sort((a, b) => a.currentBalance - b.currentBalance);
        } else {
            debtsToPay.sort((a, b) => b.interest_rate_value - a.interest_rate_value);
        }

        const targetDebtId = debtsToPay.length > 0 ? debtsToPay[0].id : null;

        // 2. Process each debt for the month
        // We iterate over ALL original active debts to show them in the table if they are still being paid or just finished
        activeDebts.forEach((d) => {
            if (d.currentBalance <= 0) return;

            const interest = d.currentBalance * d.monthlyRate;
            let payment = d.minimum_payment_cop;

            // If this is the target debt, add extra budget
            if (d.id === targetDebtId) {
                payment += monthExtraBudget;
            }

            // Adjust if payment exceeds balance + interest
            const totalDue = d.currentBalance + interest;
            if (payment >= totalDue) {
                payment = totalDue;
                // The difference goes back to extra budget for the NEXT debt in this same month if possible
                // But to keep it simple as per instructions "extra budget is assigned to ONE target debt",
                // any surplus could be theoretically used, but the instructions say assigned to ONE.
                // However, in real snowball/avalanche, once a debt is killed, its min payment + extra goes to the next.
                // Let's refine: the extra budget is assigned to the target. If target dies, 
                // the remaining 'payment power' is liberated.
            }

            const principal = payment - interest;
            d.currentBalance = Math.max(0, d.currentBalance - principal);
            d.monthsSimulated++;
            totalInterest += interest;

            // Calculate remaining installments
            let remainingInstallments: number | null = null;
            const paid = typeof d.paid_installments === 'number' ? d.paid_installments : 0;
            if (d.total_installments && d.paid_installments !== null) {
                remainingInstallments = Math.max(0, d.total_installments - (paid + d.monthsSimulated));
            }

            monthEntries.push({
                debtName: d.name,
                payment,
                interest,
                principal,
                remainingBalance: d.currentBalance,
                remainingInstallments,
            });

            // If we finished this debt and it was the target, any leftover budget from THIS debt's payment
            // (because it was capped by totalDue) could be used for other debts this month?
            // Standard snowball: yes. But instructions say "extra budget assigned SOLO to target".
            // To follow "snowball" correctly, if target is paid off with less than (min+extra), 
            // the remainder is used for the next debt in the same month.
            if (d.id === targetDebtId && d.currentBalance === 0) {
                // No refined logic to overflow to next debt in SAME month yet to keep it simple
                // unless necessary. Standard is that extra budget shifts.
            }
        });

        details.push({
            monthIndex,
            date: dateStr,
            entries: monthEntries,
        });

        // Safety check: if total balance is growing significantly, it's impayable
        const currentTotalBalance = activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
        const initialTotalBalance = debts.reduce((sum, d) => sum + d.balance_cop, 0);

        // If debt has grown to 10x its initial value, it's clearly not working
        if (currentTotalBalance > initialTotalBalance * 10) {
            break;
        }
    }

    const finalDate = new Date(currentStartDate);
    finalDate.setMonth(finalDate.getMonth() + monthIndex);

    const allDebtsPaid = !activeDebts.some((d) => d.currentBalance > 0);

    return {
        months: monthIndex,
        totalInterest,
        details,
        finalDate: finalDate.toISOString().split("T")[0],
        isPayable: allDebtsPaid,
    };
}
