import { NextResponse } from "next/server"

const VALID_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromCurrency = searchParams.get("from")
  const toCurrency = searchParams.get("to")

  if (!fromCurrency || !VALID_CURRENCIES.includes(fromCurrency)) {
    return NextResponse.json(
      { error: `Invalid source currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` },
      { status: 400 }
    )
  }

  if (!toCurrency || !VALID_CURRENCIES.includes(toCurrency)) {
    return NextResponse.json(
      { error: `Invalid target currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await response.json()
    const rate = data.rates?.[toCurrency]

    if (!rate) {
      return NextResponse.json(
        { error: "Exchange rate not available" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      from: fromCurrency,
      to: toCurrency,
      rate,
      date: data.date,
    })
  } catch (error) {
    console.error("Currency conversion error:", error)
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    )
  }
}
