import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data } = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {},
    });

    const text = data.text;

    const parsed = parseReceiptText(text);

    return NextResponse.json({
      ...parsed,
      confidence: data.confidence,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: 'Failed to process image', amount: null, currency: null, date: null, description: null, category: null, merchantName: null },
      { status: 500 }
    );
  }
}

function parseReceiptText(text: string): {
  amount: string | null;
  currency: string | null;
  date: string | null;
  description: string | null;
  category: string | null;
  merchantName: string | null;
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  let amount: string | null = null;
  let currency: string | null = null;
  let date: string | null = null;
  let description: string | null = null;
  let category: string | null = null;
  let merchantName: string | null = null;

  const currencyPatterns = [
    { pattern: /\$\s*([\d,]+\.?\d*)/gi, currency: 'USD' },
    { pattern: /£\s*([\d,]+\.?\d*)/gi, currency: 'GBP' },
    { pattern: /€\s*([\d,]+\.?\d*)/gi, currency: 'EUR' },
    { pattern: /¥\s*([\d,]+\.?\d*)/gi, currency: 'JPY' },
    { pattern: /₹\s*([\d,]+\.?\d*)/gi, currency: 'INR' },
    { pattern: /([\d,]+\.?\d*)\s*USD/gi, currency: 'USD' },
    { pattern: /([\d,]+\.?\d*)\s*INR/gi, currency: 'INR' },
    { pattern: /([\d,]+\.?\d*)\s*EUR/gi, currency: 'EUR' },
  ];

  const totalKeywords = ['total', 'amount', 'grand total', 'subtotal', 'balance due', 'amount due', 'net amount'];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (totalKeywords.some(kw => lowerLine.includes(kw))) {
      for (const { pattern, currency: curr } of currencyPatterns) {
        const match = line.match(pattern);
        if (match) {
          amount = match[1].replace(/,/g, '');
          currency = curr;
          break;
        }
      }
      if (amount) break;
    }
  }

  if (!amount) {
    for (const { pattern, currency: curr } of currencyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const lastMatch = matches[matches.length - 1];
        const numMatch = lastMatch.match(/[\d,]+\.?\d*/);
        if (numMatch) {
          amount = numMatch[0].replace(/,/g, '');
          currency = curr;
          break;
        }
      }
    }
  }

  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString().split('T')[0];
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (lines.length > 0) {
    merchantName = lines[0];
    if (merchantName.length > 50) {
      merchantName = merchantName.substring(0, 50);
    }
  }

  const categoryKeywords: Record<string, string[]> = {
    Travel: ['taxi', 'uber', 'lyft', 'flight', 'airline', 'train', 'bus', 'metro', 'subway', 'transport', 'parking', 'fuel', 'gas'],
    Food: ['restaurant', 'cafe', 'coffee', 'food', 'lunch', 'dinner', 'breakfast', 'hotel', 'dining', 'bar', 'pizza', 'burger'],
    Accommodation: ['hotel', 'motel', 'inn', 'hostel', 'airbnb', 'resort', 'lodge'],
    Office: ['office', 'supplies', 'stationery', 'printing', 'equipment'],
    Communication: ['phone', 'mobile', 'internet', 'telecom'],
    Miscellaneous: [],
  };

  const lowerText = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      category = cat;
      break;
    }
  }

  if (!category) {
    category = 'Miscellaneous';
  }

  if (merchantName) {
    description = merchantName;
  }

  return {
    amount,
    currency,
    date,
    description,
    category,
    merchantName,
  };
}
