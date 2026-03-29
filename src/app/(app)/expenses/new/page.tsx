"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Scan } from "lucide-react"

const EXPENSE_CATEGORIES = [
  { value: "TRAVEL", label: "Travel" },
  { value: "MEALS", label: "Meals" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
]

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
]

export default function NewExpensePage() {
  const router = useRouter()
  const [companyCurrency, setCompanyCurrency] = useState("USD")
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    category: "OTHER",
    date: new Date().toISOString().split("T")[0],
    submittedAmount: "",
    submittedCurrency: "USD",
    exchangeRate: "1",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [ocrResult, setOcrResult] = useState<{
    amount?: number
    currency?: string
    date?: string
    vendor?: string
    confidence: number
  } | null>(null)
  const [processingOcr, setProcessingOcr] = useState(false)
  const [expenseId, setExpenseId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompanyCurrency() {
      try {
        const res = await fetch("/api/expenses")
        if (res.ok) {
          const data = await res.json()
          setCompanyCurrency(data.companyCurrency || "USD")
          const companyCurr = data.companyCurrency || "USD"
          setFormData((prev) => {
            if (prev.submittedCurrency !== companyCurr) {
              return { ...prev, submittedCurrency: companyCurr }
            }
            return prev
          })
        }
      } catch {
        console.error("Failed to fetch company currency")
      }
    }
    fetchCompanyCurrency()
  }, [])

  const fetchExchangeRate = async () => {
    if (formData.submittedCurrency === companyCurrency) {
      setExchangeRate(1)
      setFormData((prev) => ({ ...prev, exchangeRate: "1" }))
      return
    }

    setRateLoading(true)
    try {
      const res = await fetch(`/api/currency?from=${formData.submittedCurrency}&to=${companyCurrency}`)
      if (res.ok) {
        const data = await res.json()
        setExchangeRate(data.rate)
        setFormData((prev) => ({ ...prev, exchangeRate: data.rate.toString() }))
      }
    } catch {
      console.error("Failed to fetch exchange rate")
    } finally {
      setRateLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
    }
  }

  const processOcr = async () => {
    if (!expenseId || !receiptFile) return

    setProcessingOcr(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", receiptFile)
      formDataUpload.append("expenseId", expenseId)

      const uploadRes = await fetch("/api/receipts", {
        method: "POST",
        body: formDataUpload,
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to upload receipt")
      }

      const { receiptId } = await uploadRes.json()

      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId }),
      })

      if (ocrRes.ok) {
        const data = await ocrRes.json()
        setOcrResult(data.ocrData)
      }
    } catch {
      console.error("OCR processing failed")
    } finally {
      setProcessingOcr(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          category: formData.category,
          date: formData.date,
          submittedAmount: parseFloat(formData.submittedAmount),
          submittedCurrency: formData.submittedCurrency,
          exchangeRate: parseFloat(formData.exchangeRate),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create expense")
        setLoading(false)
        return
      }

      const data = await res.json()
      setExpenseId(data.id)
      router.push("/expenses")
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const applyOcrData = () => {
    if (!ocrResult) return

    const updates: Partial<typeof formData> = {}
    if (ocrResult.amount) {
      updates.submittedAmount = ocrResult.amount.toString()
    }
    if (ocrResult.currency && CURRENCIES.some((c) => c.value === ocrResult.currency)) {
      updates.submittedCurrency = ocrResult.currency
    }
    if (ocrResult.date) {
      updates.date = ocrResult.date
    }
    if (ocrResult.vendor) {
      updates.description = ocrResult.vendor
    }

    setFormData((prev) => ({ ...prev, ...updates }))
    setOcrResult(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Expense</CardTitle>
          <CardDescription>Submit a new expense for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Business lunch with client"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submittedAmount">Amount</Label>
                <Input
                  id="submittedAmount"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={formData.submittedAmount}
                  onChange={(e) => setFormData({ ...formData, submittedAmount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submittedCurrency">Currency</Label>
                <Select
                  value={formData.submittedCurrency}
                  onValueChange={(value) => setFormData({ ...formData, submittedCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="exchangeRate">Exchange Rate (to {companyCurrency})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchExchangeRate}
                  disabled={rateLoading || formData.submittedCurrency === companyCurrency}
                >
                  {rateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Rate"}
                </Button>
              </div>
              <Input
                id="exchangeRate"
                type="number"
                step="0.000001"
                placeholder="1.00"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                required
              />
              {exchangeRate && (
                <p className="text-xs text-muted-foreground">
                  1 {formData.submittedCurrency} = {exchangeRate} {companyCurrency}
                </p>
              )}
            </div>

            {formData.submittedAmount && formData.exchangeRate && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm">
                <p className="font-medium">
                  Converted Amount: {(parseFloat(formData.submittedAmount) * parseFloat(formData.exchangeRate)).toFixed(2)} {companyCurrency}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Receipt (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {expenseId && receiptFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={processOcr}
                    disabled={processingOcr}
                  >
                    {processingOcr ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                    <span className="ml-2">Scan</span>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a receipt image or PDF to auto-fill expense details
              </p>
            </div>

            {ocrResult && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-green-800">Receipt Scanned</p>
                  <span className="text-xs text-green-600">
                    {(ocrResult.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  {ocrResult.vendor && <p>Vendor: {ocrResult.vendor}</p>}
                  {ocrResult.amount && <p>Amount: {ocrResult.amount} {ocrResult.currency}</p>}
                  {ocrResult.date && <p>Date: {ocrResult.date}</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button type="button" size="sm" onClick={applyOcrData}>
                    Apply to Form
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setOcrResult(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
