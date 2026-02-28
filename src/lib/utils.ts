import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a price to pounds based on currency.
 * GBp (pence) needs to be divided by 100.
 */
export function getPriceInPounds(price: number, currency: string | undefined): number {
  if (currency === "GBp") {
    return price / 100;
  }
  return price;
}
