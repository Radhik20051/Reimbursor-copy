import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const base = searchParams.get('base');

  if (!base) {
    return NextResponse.json({ error: 'Base currency is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${base.toUpperCase()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Exchange rate error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
