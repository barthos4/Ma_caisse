import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyCFA(amount: number): string {
  const formattedNumber = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0, // Changed
    maximumFractionDigits: 0, // Changed
  });
  return `${formattedNumber} F CFA`;
}
