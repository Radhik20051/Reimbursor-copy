import { NextResponse } from "next/server"

export async function GET() {
  const countries = [
    { code: "US", name: "United States", currency: "USD" },
    { code: "IN", name: "India", currency: "INR" },
    { code: "GB", name: "United Kingdom", currency: "GBP" },
    { code: "DE", name: "Germany", currency: "EUR" },
    { code: "FR", name: "France", currency: "EUR" },
    { code: "JP", name: "Japan", currency: "JPY" },
    { code: "CA", name: "Canada", currency: "CAD" },
    { code: "AU", name: "Australia", currency: "AUD" },
  ]

  return NextResponse.json({ countries })
}
