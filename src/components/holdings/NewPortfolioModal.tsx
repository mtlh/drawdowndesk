"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { X, Wallet } from "lucide-react"

interface NewPortfolioModalProps {
  isOpen: boolean
  onClose: () => void
  newPortfolioName: string
  onNewPortfolioNameChange: (value: string) => void
  newPortfolioType: "live" | "manual"
  onNewPortfolioTypeChange: (value: "live" | "manual") => void
  portfolioNameError: string | null
  isSaving: boolean
  onSubmit: () => void
}

export function NewPortfolioModal({
  isOpen,
  onClose,
  newPortfolioName,
  onNewPortfolioNameChange,
  newPortfolioType,
  onNewPortfolioTypeChange,
  portfolioNameError,
  isSaving,
  onSubmit,
}: NewPortfolioModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create New Portfolio</h2>
                <p className="text-sm text-muted-foreground">Track a new investment portfolio</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div>
            <label htmlFor="portfolio-name" className="text-sm font-medium">Portfolio Name</label>
            <Input
              id="portfolio-name"
              placeholder="e.g., Retirement Fund, Growth Portfolio"
              value={newPortfolioName}
              onChange={(e) => onNewPortfolioNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmit()
                }
              }}
              className={`mt-1.5 ${portfolioNameError ? "border-destructive focus:border-destructive" : ""}`}
              aria-invalid={!!portfolioNameError}
            />
            {portfolioNameError && (
              <p className="text-xs text-destructive mt-1">{portfolioNameError}</p>
            )}
          </div>
          <div>
            <label htmlFor="portfolio-type" className="text-sm font-medium">Portfolio Type</label>
            <Select value={newPortfolioType} onValueChange={(value: "live" | "manual") => onNewPortfolioTypeChange(value)}>
              <SelectTrigger id="portfolio-type" className="mt-1.5" aria-label="Select portfolio type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live (API-tracked)</SelectItem>
                <SelectItem value="manual">Manual (Pensions, OICS, etc.)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {newPortfolioType === "live" 
                ? "For portfolios with tickers that can be tracked via API"
                : "For portfolios like pensions or OICS that you'll update manually"}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSaving || !newPortfolioName.trim()} className="flex-1">
              {isSaving ? "Creating..." : "Create Portfolio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}