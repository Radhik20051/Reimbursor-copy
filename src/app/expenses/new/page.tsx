"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

      router.push("/expenses")
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
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
              <Label htmlFor="exchangeRate">Exchange Rate (to company currency)</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.000001"
                placeholder="1.00"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                required
              />
            </div>

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
