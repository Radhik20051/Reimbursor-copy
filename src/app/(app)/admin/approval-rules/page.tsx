"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ApprovalRule {
  id: string
  name: string
  description: string | null
  minAmount: string
  maxAmount: string | null
  stepOrder: number
  ruleType: string
  requiredApprovers: string
  isManagerApproval: boolean
  approverRole: string | null
  approverId: string | null
  isAutoApproved: boolean
  autoApproveRole: string | null
}

interface RuleFormData {
  name: string
  description: string
  minAmount: string
  maxAmount: string
  stepOrder: string
  ruleType: string
  requiredApprovers: string
  isManagerApproval: boolean
  approverRole: string
  approverId: string
  isAutoApproved: boolean
  autoApproveRole: string
}

const RULE_TYPES = [
  { value: "SEQUENTIAL", label: "Sequential - Approvers must approve in order" },
  { value: "PERCENTAGE", label: "Percentage - Approved when X% of approvers agree" },
  { value: "SPECIFIC", label: "Specific - Auto-approved when specific role approves" },
  { value: "HYBRID", label: "Hybrid - Combination of percentage and specific rules" },
]

const ROLES = [
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
]

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    description: "",
    minAmount: "0",
    maxAmount: "",
    stepOrder: "1",
    ruleType: "SEQUENTIAL",
    requiredApprovers: "1",
    isManagerApproval: false,
    approverRole: "",
    approverId: "",
    isAutoApproved: false,
    autoApproveRole: "",
  })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/approval-rules")
      const data = await res.json()
      if (res.ok) {
        setRules(data.rules)
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingRule(null)
    setFormData({
      name: "",
      description: "",
      minAmount: "0",
      maxAmount: "",
      stepOrder: String(rules.length + 1),
      ruleType: "SEQUENTIAL",
      requiredApprovers: "1",
      isManagerApproval: false,
      approverRole: "",
      approverId: "",
      isAutoApproved: false,
      autoApproveRole: "",
    })
    setError("")
    setDialogOpen(true)
  }

  const openEditDialog = (rule: ApprovalRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || "",
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount || "",
      stepOrder: String(rule.stepOrder),
      ruleType: rule.ruleType,
      requiredApprovers: rule.requiredApprovers,
      isManagerApproval: rule.isManagerApproval,
      approverRole: rule.approverRole || "",
      approverId: rule.approverId || "",
      isAutoApproved: rule.isAutoApproved,
      autoApproveRole: rule.autoApproveRole || "",
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const url = editingRule ? "/api/approval-rules" : "/api/approval-rules"
      const method = editingRule ? "PUT" : "POST"
      const body = {
        ...(editingRule && { ruleId: editingRule.id }),
        name: formData.name,
        description: formData.description || null,
        minAmount: parseFloat(formData.minAmount),
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
        stepOrder: parseInt(formData.stepOrder),
        ruleType: formData.ruleType,
        requiredApprovers: formData.requiredApprovers,
        isManagerApproval: formData.isManagerApproval,
        approverRole: formData.approverRole || null,
        approverId: formData.approverId || null,
        isAutoApproved: formData.isAutoApproved,
        autoApproveRole: formData.autoApproveRole || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save rule")
        return
      }

      setDialogOpen(false)
      fetchRules()
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return

    try {
      const res = await fetch(`/api/approval-rules?ruleId=${ruleId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchRules()
      }
    } catch (err) {
      console.error("Failed to delete rule:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Rules</h1>
          <p className="text-muted-foreground">Configure expense approval workflows</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>Add Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Rule" : "Add Approval Rule"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Manager Approval"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stepOrder">Step Order</Label>
                  <Input
                    id="stepOrder"
                    type="number"
                    min="1"
                    value={formData.stepOrder}
                    onChange={(e) => setFormData({ ...formData, stepOrder: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this approval step"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Min Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Max Amount (Optional)</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type</Label>
                <Select
                  value={formData.ruleType}
                  onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rule type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.ruleType === "PERCENTAGE" || formData.ruleType === "HYBRID") && (
                <div className="space-y-2">
                  <Label htmlFor="requiredApprovers">Required Approvers (e.g., &quot;2&quot; or &quot;60%&quot;)</Label>
                  <Input
                    id="requiredApprovers"
                    value={formData.requiredApprovers}
                    onChange={(e) => setFormData({ ...formData, requiredApprovers: e.target.value })}
                    placeholder="2 or 60%"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isManagerApproval"
                  checked={formData.isManagerApproval}
                  onCheckedChange={(checked) => setFormData({ ...formData, isManagerApproval: checked })}
                />
                <Label htmlFor="isManagerApproval">Require Manager Approval First</Label>
              </div>

              {formData.ruleType === "SEQUENTIAL" && (
                <div className="space-y-2">
                  <Label htmlFor="approverRole">Approver Role</Label>
                  <Select
                    value={formData.approverRole}
                    onValueChange={(value) => setFormData({ ...formData, approverRole: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approver role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(formData.ruleType === "SPECIFIC" || formData.ruleType === "HYBRID") && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAutoApproved"
                    checked={formData.isAutoApproved}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAutoApproved: checked })}
                  />
                  <Label htmlFor="isAutoApproved">Auto-approve when specific role approves</Label>
                </div>
              )}

              {formData.isAutoApproved && (
                <div className="space-y-2">
                  <Label htmlFor="autoApproveRole">Auto-Approve Role</Label>
                  <Select
                    value={formData.autoApproveRole}
                    onValueChange={(value) => setFormData({ ...formData, autoApproveRole: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select auto-approve role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingRule ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow Rules</CardTitle>
          <CardDescription>Configure how expenses are approved based on amount and conditions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">No approval rules configured. Add a rule to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount Range</TableHead>
                  <TableHead>Rule Type</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.stepOrder}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      {rule.maxAmount ? (
                        <>
                          ${rule.minAmount} - ${rule.maxAmount}
                        </>
                      ) : (
                        <>${rule.minAmount}+</>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.ruleType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.isManagerApproval && <span>Manager First </span>}
                      {rule.isAutoApproved && <span>Auto-approve by {rule.autoApproveRole} </span>}
                      {rule.requiredApprovers && rule.requiredApprovers !== "1" && (
                        <span>{rule.requiredApprovers} needed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(rule)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
