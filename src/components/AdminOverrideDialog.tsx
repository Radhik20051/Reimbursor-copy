"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { adminOverrideExpense } from "@/app/actions/adminOverride"

interface AdminOverrideDialogProps {
  expenseId: string
  expenseDescription?: string
  action: "APPROVE" | "REJECT"
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdminOverrideDialog({
  expenseId,
  action,
  open,
  onClose,
  onSuccess,
}: AdminOverrideDialogProps) {
  const [comment, setComment] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const result = await adminOverrideExpense({
      expenseId,
      action,
      comment: comment || undefined,
    })

    if (result.success) {
      onClose()
      onSuccess()
    } else {
      setError(result.error || "An error occurred")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Override Expense — {action === "APPROVE" ? "Approve" : "Reject"}
          </DialogTitle>
          <DialogDescription>
            This will immediately {action === "APPROVE" ? "approve" : "reject"}{" "}
            this expense, bypassing the current approval workflow. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Comment (optional)</label>
          <Textarea
            placeholder="Add a comment about this override..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={action === "APPROVE" ? "success" : "destructive"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : "Confirm Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
