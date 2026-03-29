import { Id } from "../../convex/_generated/dataModel";
import { calculateTaperedPersonalAllowance } from "./taxCalculations";

// return type for the take-home pay calculation
export type TakeHomePay = {
    error?: string;
    takeHomePay: number;
    nationalInsurance: number;
    incomeTax: number;
    personalAllowance: number;
};

export type TaxInfo = {
    error: string;
    taxYear?: undefined;
    personalAllowance?: undefined;
    bands?: undefined;
    capitalGainsTax?: undefined;
} | {
    taxYear: number;
    incomeType: string;
    personalAllowance: {
        _id: Id<"personalAllowances">;
        _creationTime: number;
        taperRatePercent: number;
        amount: number;
        taperThreshold: number;
    };
    bands: {
        _id: Id<"taxBands">;
        _creationTime: number;
        taxYearId: Id<"taxYears">;
        incomeType: string;
        bandName: string;
        bandStartAmount: number;
        bandEndAmount: number | undefined;
        taxRatePercent: number;
        nationalInsuranceRate: number | undefined;
        additionalNotes: string | undefined;
        lastUpdated: string | undefined;
    }[];
    capitalGainsTax?: {
        _id: Id<"capitalGainsTax">;
        _creationTime: number;
        taxYearId: Id<"taxYears">;
        annualExemptAmount: number;
        basicRatePercent: number;
        higherRatePercent: number;
    }[];
    error?: undefined;
}

export function CreateTakeHome(taxInfo: TaxInfo, income: number): TakeHomePay {

    if (!taxInfo || !taxInfo.bands || taxInfo.bands.length === 0 ) {
        return { error: "Tax information not available.", takeHomePay: 0, nationalInsurance: 0, incomeTax: 0, personalAllowance: 0 };
    }

    let takeHomePay = income;
    let nationalInsurance = 0;
    let incomeTax = 0;

    // Take off personal allowance (with tapering if over threshold)
    const personalAllowance = calculateTaperedPersonalAllowance(takeHomePay, taxInfo.personalAllowance);

    // Calculate National Insurance & Income Tax
    taxInfo.bands.forEach(band => {
        const bandEnd = band.bandEndAmount ?? Infinity;
        const taxableAmount = Math.min(income, bandEnd) - band.bandStartAmount;
        if (taxableAmount > 0) {
            const appliedincomeTax = taxableAmount * (band.taxRatePercent / 100);
            incomeTax += appliedincomeTax;
            takeHomePay -= appliedincomeTax;
            // Only apply NI if explicitly defined
            if (band.nationalInsuranceRate !== undefined) {
                const appliedNationalInsurance = taxableAmount * (band.nationalInsuranceRate / 100);
                nationalInsurance += appliedNationalInsurance;
                takeHomePay -= appliedNationalInsurance;
            }
        }
    });

    return {
        takeHomePay: takeHomePay,
        nationalInsurance: nationalInsurance,
        incomeTax: incomeTax,
        personalAllowance: personalAllowance,
    };
}