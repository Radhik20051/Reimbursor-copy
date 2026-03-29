import { NextResponse } from 'next/server';

let cachedCountries: { name: string; currency: string }[] | null = null;

export async function GET() {
  if (cachedCountries) {
    return NextResponse.json(cachedCountries);
  }

  try {
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,currencies'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }

    const data = await response.json();

    cachedCountries = data
      .map((country: { name: { common: string }; currencies?: Record<string, { name: string; symbol?: string }> }) => {
        const currencyCode = Object.keys(country.currencies || {})[0] || null;
        return {
          name: country.name.common,
          currency: currencyCode,
        };
      })
      .filter((c: { name: string; currency: string | null }) => c.currency)
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json(cachedCountries);
  } catch (error) {
    console.error('Countries API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
