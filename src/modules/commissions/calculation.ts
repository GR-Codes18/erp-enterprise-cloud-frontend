import { fromCents, toCents } from "@/shared/lib/money"

function rateToBasisPoints(rate: string): number {
  const [whole, fraction = ""] = rate.split(".")
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
}

/** Calculates the commission in cents to avoid floating-point currency rounding. */
export function calculateCommission(salesAmount: string, ratePercentage: string): string {
  const salesCents = toCents(salesAmount)
  const rateBasisPoints = rateToBasisPoints(ratePercentage)
  const scaled = salesCents * rateBasisPoints
  if (!Number.isSafeInteger(scaled)) throw new Error("Commission calculation exceeds the safe numeric range")
  return fromCents(Math.round(scaled / 10_000))
}
