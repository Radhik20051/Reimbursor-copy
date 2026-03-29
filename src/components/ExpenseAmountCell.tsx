"use client"

import { formatCurrency } from "@/lib/formatCurrency"

interface ExpenseAmountCellProps {
  convertedAmount: number
  companyCurrency: string
  submittedAmount: number
  submittedCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

export function ExpenseAmountCell({
  convertedAmount,
  companyCurrency,
  submittedAmount,
  submittedCurrency,
  viewerRole,
}: ExpenseAmountCellProps) {
  if (viewerRole === "MANAGER") {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {formatCurrency(convertedAmount, companyCurrency)}
        </span>
        {submittedCurrency !== companyCurrency && (
          <span className="text-xs text-muted-foreground mt-0.5">
            Originally {formatCurrency(submittedAmount, submittedCurrency)}
          </span>
        )}
      </div>
    )
  }

  if (viewerRole === "EMPLOYEE") {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {formatCurrency(submittedAmount, submittedCurrency)}
        </span>
        {submittedCurrency !== companyCurrency && (
          <span className="text-xs text-muted-foreground mt-0.5">
            ≈ {formatCurrency(convertedAmount, companyCurrency)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-sm">
        {formatCurrency(convertedAmount, companyCurrency)}
        <span className="ml-1 text-xs text-muted-foreground">(company)</span>
      </span>
      <span className="text-xs text-muted-foreground">
        {formatCurrency(submittedAmount, submittedCurrency)}
        <span className="ml-1">(submitted)</span>
      </span>
    </div>
  )
}
