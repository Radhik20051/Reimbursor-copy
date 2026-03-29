import { NextResponse } from 'next/server';

export async function GET() {
  const defaultCountry = process.env.DEFAULT_COUNTRY;

  if (!defaultCountry) {
    return NextResponse.json(null);
  }

  try {
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,currencies'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }

    const data = await response.json();

    const country = data.find(
      (c: { name: { common: string } }) =>
        c.name.common.toLowerCase() === defaultCountry.toLowerCase()
    );

    if (!country) {
      return NextResponse.json(null);
    }

    const currencyCode = Object.keys(country.currencies || {})[0] || null;

    return NextResponse.json({
      name: country.name.common,
      currency: currencyCode,
    });
  } catch (error) {
    console.error('Default country API error:', error);
    return NextResponse.json(null);
  }
}
