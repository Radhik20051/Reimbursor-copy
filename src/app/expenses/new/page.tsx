'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Upload, Loader2, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office', 'Communication', 'Miscellaneous'];

export default function NewExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [submittedCurrency, setSubmittedCurrency] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setPaidBy(session.user.name);
      setSubmittedCurrency(session.user.companyCurrency);
    }
  }, [session]);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      if (!submittedCurrency || submittedCurrency === session?.user?.companyCurrency) {
        return;
      }

      try {
        const response = await fetch(`/api/exchange-rate?base=${submittedCurrency}`);
        const data = await response.json();
        if (data.rates && session?.user?.companyCurrency && data.rates[session.user.companyCurrency]) {
          setExchangeRates(data.rates);
        }
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
      }
    };

    fetchExchangeRates();
  }, [submittedCurrency, session]);

  useEffect(() => {
    if (submittedAmount && session?.user?.companyCurrency && exchangeRates[session.user.companyCurrency]) {
      const rate = exchangeRates[session.user.companyCurrency];
      const amount = parseFloat(submittedAmount) * rate;
      setConvertedAmount(amount);
      setConversionRate(rate);
    } else if (submittedAmount && submittedCurrency === session?.user?.companyCurrency) {
      setConvertedAmount(parseFloat(submittedAmount));
      setConversionRate(1);
    } else {
      setConvertedAmount(null);
      setConversionRate(null);
    }
  }, [submittedAmount, exchangeRates, submittedCurrency, session]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setOcrLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.amount) {
        setSubmittedAmount(data.amount);
      }
      if (data.currency) {
        setSubmittedCurrency(data.currency);
      }
      if (data.date) {
        setDate(data.date);
      }
      if (data.merchantName || data.description) {
        setDescription(data.merchantName || data.description || '');
      }
      if (data.category) {
        setCategory(data.category);
      }
    } catch (err) {
      console.error('OCR error:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description || !category || !submittedAmount || !date) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let receiptData: string | undefined;
      let receiptMimeType: string | undefined;

      if (receiptFile) {
        const arrayBuffer = await receiptFile.arrayBuffer();
        receiptData = Buffer.from(arrayBuffer).toString('base64');
        receiptMimeType = receiptFile.type;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          category,
          paidBy,
          submittedAmount: parseFloat(submittedAmount),
          submittedCurrency,
          convertedAmount: convertedAmount || parseFloat(submittedAmount),
          conversionRate: conversionRate || 1,
          date,
          remarks,
          receiptData,
          receiptMimeType,
        }),
      });

      if (response.ok) {
        router.push('/expenses');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit expense');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">Reimbursor</h1>
              <nav className="ml-10 flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/expenses" className="text-gray-900 font-medium">
                  Expenses
                </Link>
                {(session.user.role === 'MANAGER' || session.user.role === 'ADMIN') && (
                  <Link href="/approvals" className="text-gray-500 hover:text-gray-900">
                    Approvals
                  </Link>
                )}
                {session.user.role === 'ADMIN' && (
                  <>
                    <Link href="/admin/users" className="text-gray-500 hover:text-gray-900">
                      Users
                    </Link>
                    <Link href="/admin/approval-rules" className="text-gray-500 hover:text-gray-900">
                      Approval Rules
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <div className="text-sm">
                <p className="font-medium">{session.user.name}</p>
                <p className="text-muted-foreground text-xs">{session.user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Submit New Expense</h2>
          <p className="text-muted-foreground">Fill in the details of your expense</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Attach Receipt (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receiptPreview ? (
              <div className="relative inline-block">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-48 rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8"
                  onClick={removeReceipt}
                >
                  <X className="h-4 w-4" />
                </Button>
                {ocrLoading && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </label>
            )}
            {ocrLoading && !receiptPreview && (
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Processing receipt with OCR...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the expense"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidBy">Paid By</Label>
                  <Input
                    id="paidBy"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="Who paid?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={submittedAmount}
                    onChange={(e) => setSubmittedAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={submittedCurrency} onValueChange={setSubmittedCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={session.user.companyCurrency}>
                        {session.user.companyCurrency} (Company Currency)
                      </SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {convertedAmount !== null && submittedCurrency !== session.user.companyCurrency && (
                <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Converted Amount:</strong> {convertedAmount.toFixed(2)} {session.user.companyCurrency}
                    <span className="text-blue-600 ml-2">(Rate: {conversionRate?.toFixed(6)})</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/expenses">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
