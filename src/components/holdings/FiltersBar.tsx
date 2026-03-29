"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter, ArrowUpDown } from "lucide-react"

interface FiltersBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  sortBy: "date" | "value"
  onSortChange: (value: "date" | "value") => void
  typeFilter: "all" | "live" | "manual"
  onTypeFilterChange: (value: "all" | "live" | "manual") => void
  accountFilter: string
  onAccountFilterChange: (value: string) => void
  uniqueAccounts: string[]
  onAddPortfolio: () => void
}

export function FiltersBar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  accountFilter,
  onAccountFilterChange,
  uniqueAccounts,
  onAddPortfolio,
}: FiltersBarProps) {
  const hasActiveFilters = typeFilter !== "all" || accountFilter !== "all"

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search holdings..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[180px] h-9 pl-9 bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
          <Select value={sortBy} onValueChange={(value: "date" | "value") => onSortChange(value)}>
            <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Sort by">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Created Date</SelectItem>
              <SelectItem value="value">Market Value</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-5 bg-border" />
          <Select value={typeFilter} onValueChange={(value: "all" | "live" | "manual") => onTypeFilterChange(value)}>
            <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-5 bg-border" />
          <Select value={accountFilter} onValueChange={onAccountFilterChange}>
            <SelectTrigger className="w-[150px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by account">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {uniqueAccounts.map((account) => (
                <SelectItem key={account} value={account}>{account}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowUpDown className="w-4 h-4" />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onTypeFilterChange("all"); onAccountFilterChange("all"); }}
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onAddPortfolio} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Portfolio
        </Button>
      </div>
    </div>
  )
}