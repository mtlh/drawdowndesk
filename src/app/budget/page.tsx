"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { validateForm, commonRules, ValidationRule } from "@/lib/validation"
import { BUDGET_CATEGORIES, AVAILABLE_ICONS, getCategoryById } from "@/lib/budget-categories"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PieChartTooltip } from "@/components/chart-tooltip"
import { useQuery, useMutation } from "convex/react"
import { AuthRequired } from "@/hooks/useRequireAuth"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import {
  Plus, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Search, X, Check, ChevronDown, Home, Car, ShoppingCart, Zap, Shield,
  HeartPulse, CreditCard, Baby, Shirt, Sparkles, Tv2, UtensilsCrossed,
  Monitor, ShoppingBag, Plane, Gamepad2, Dumbbell, Swords, Wine, Gift,
  PawPrint, GraduationCap, Wallet, PiggyBank, Banknote, Landmark, Receipt,
  Utensils, Coffee, CupSoda, Cake, Apple, Leaf, TreePine, Fuel, Carrot,
  CookingPot, ShowerHead, WashingMachine, Thermometer, Wifi, Smartphone,
  Laptop, Printer, Camera, Music, Headphones, BookOpen, Newspaper, PenLine,
  NotebookPen, Briefcase, User, Users, Heart, Star, Sun, Moon, Cloud,
  Umbrella, Glasses, Watch, Ear, Mic, Keyboard, Mouse, Speaker, Tv, Radio,
  Disc, Library, Bus, Train, Bike, Footprints, ParkingMeter, MapPin, Compass,
  Globe, Luggage, Ticket, Sailboat, Tent, Building, Factory, Store,
  ShoppingBasket, Package, Box, BicepsFlexed, PersonStanding,
  Scale, Currency, Coins, DollarSign, PoundSterling, Euro,
  Bitcoin, Gem, Crown, Trophy, Medal, Flame, Wand, Palette, Brush,
  Scissors, Ruler, Calculator as CalcIcon, FileText, FolderOpen, Archive,
  Clipboard, StickyNote, Tag, Bell, AlertCircle, Info, HelpCircle,
  MessageCircle, Mail, Phone, Video, Image, ScanFace, Fingerprint,
  KeyRound, Lock, Unlock, Eye, EyeOff, ZoomIn, ZoomOut, Filter,
  SlidersHorizontal, Settings, Wrench, Hammer, Drill, PaintBucket,
  Shovel, Bug, Bone, Tractor, ChefHat, GlassWater, Beer, Pill, Syringe,
  Bed, Sofa, Armchair, DoorOpen, PanelTop, LayoutGrid, SquareCode, Terminal,
  Cpu, HardDrive, Server, Database, CloudUpload, CloudDownload, Share2,
  Link, AtSign, Hash, List, AlignLeft, BarChart2, Activity, Target,
  Crosshair, Navigation, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp,
  Minus, CheckCircle2, XCircle, AlertTriangle, Rocket, Orbit,
  Sunset, Sunrise, Waves, Mountain, Castle, Church, Warehouse, Hospital, School, University,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetExpense {
  _id: Id<"budgetExpenses">
  _creationTime: number
  userId: string
  name: string
  amount: number
  category: string
  categoryType: "need" | "want"
  isRecurring: boolean
  icon: string
  notes?: string
  lastUpdated?: string
}

type NewExpenseForm = {
  name: string
  amount: string
  category: string
  categoryType: "need" | "want"
  isRecurring: boolean
  icon: string
  notes: string
}

const DEFAULT_FORM: NewExpenseForm = {
  name: "",
  amount: "",
  category: "",
  categoryType: "need",
  isRecurring: true,
  icon: "Home",
  notes: "",
}

// ─── Icon Picker Component ─────────────────────────────────────────────────────

function IconPickerDialog({
  value,
  onSelect,
}: {
  value: string
  onSelect: (icon: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return AVAILABLE_ICONS
    const q = search.toLowerCase()
    return AVAILABLE_ICONS.filter((icon) => icon.toLowerCase().includes(q))
  }, [search])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 h-9 px-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted">
            <IconDisplay name={value} className="w-3.5 h-3.5" />
          </span>
          <span className="truncate text-sm">{value}</span>
          <ChevronDown className="ml-auto w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose an Icon</DialogTitle>
          <DialogDescription>Search or scroll to find an icon.</DialogDescription>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search icons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="h-72 mt-2 pr-1 overflow-y-auto">
          <div className="grid grid-cols-6 gap-1.5">
            {filtered.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  onSelect(iconName)
                  setOpen(false)
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all hover:bg-accent",
                  value === iconName
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent"
                )}
              >
                <IconDisplay name={iconName} className="w-5 h-5" />
                <span className="text-[9px] text-muted-foreground leading-tight text-center">
                  {iconName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Icon Display ──────────────────────────────────────────────────────────────
// Renders a Lucide icon by name at runtime using a lookup map.
// This avoids importing every single icon statically.
function IconDisplay({ name, className }: { name: string; className?: string }) {
  const iconMap: Record<string, LucideIcon> = {
    Home, Car, ShoppingCart, Zap, Shield, HeartPulse, CreditCard,
    Baby, Shirt, Sparkles, Tv2, UtensilsCrossed, Monitor, ShoppingBag,
    Plane, Gamepad2, Dumbbell, Swords, Wine, Gift, PawPrint,
    GraduationCap, Wallet, PiggyBank, Banknote, Landmark, Receipt,
    Utensils, Coffee, CupSoda, Cake, Apple, Leaf, TreePine,
    Fuel, Carrot, CookingPot, ShowerHead, WashingMachine, Thermometer,
    Wifi, Smartphone, Laptop, Printer, Camera, Music, Headphones,
    BookOpen, Newspaper, PenLine, NotebookPen, Briefcase, User,
    Users, Heart, Star, Sun, Moon, Cloud, Umbrella, Glasses,
    Watch, Ear, Mic, Keyboard, Mouse, Speaker, Tv, Radio,
    Disc, Library, Bus, Train, Bike, Footprints, ParkingMeter,
    MapPin, Compass, Globe, Luggage, Ticket, Sailboat, Tent,
    Building, Factory, Store, ShoppingBasket, Package, Box,
    BicepsFlexed, PersonStanding, Scale,
    Currency, Coins, DollarSign, PoundSterling, Euro, Bitcoin,
    Gem, Crown, Trophy, Medal, Flame, Wand, Palette,
    Brush, Pencil, Scissors, Ruler, CalcIcon, FileText,
    FolderOpen, Archive, Trash2, Clipboard, StickyNote, Tag,
    Bell, AlertCircle, Info, HelpCircle, MessageCircle, Mail,
    Phone, Video, Image, ScanFace, Fingerprint,
    KeyRound, Lock, Unlock, Eye, EyeOff, ZoomIn,
    ZoomOut, Filter, SlidersHorizontal, Settings, Wrench, Hammer,
    Drill, PaintBucket, Shovel, Bug, Bone, Tractor,
    ChefHat, GlassWater, Beer, Pill, Syringe,
    Bed, Sofa, Armchair, DoorOpen, PanelTop, LayoutGrid,
    SquareCode, Terminal, Cpu, HardDrive, Server, Database,
    CloudUpload, CloudDownload, Share2, Link, AtSign,
    Hash, List, AlignLeft, BarChart2, Activity, Target, Crosshair, Navigation,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp,
    Plus, Minus,
    Check, CheckCircle2, XCircle, AlertTriangle,
    Rocket, Orbit,
    Sunset, Sunrise, Waves, Mountain,
    Castle, Church, Warehouse, Hospital, School, University,
  }

  const Icon = iconMap[name]
  if (!Icon) return <span className={cn("w-4 h-4 inline-block", className)}>{name[0]}</span>
  return <Icon className={className} />
}

// ─── Budget Form ──────────────────────────────────────────────────────────────

interface BudgetFormProps {
  expense?: BudgetExpense
  onSubmit: (form: NewExpenseForm) => void
  onCancel: () => void
  isLoading: boolean
}

function BudgetForm({ expense, onSubmit, onCancel, isLoading }: BudgetFormProps) {
  const [form, setForm] = useState<NewExpenseForm>(() =>
    expense
      ? {
          name: expense.name,
          amount: expense.amount.toString(),
          category: expense.category,
          categoryType: expense.categoryType,
          isRecurring: expense.isRecurring,
          icon: expense.icon,
          notes: expense.notes ?? "",
        }
      : { ...DEFAULT_FORM }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [overrideType, setOverrideType] = useState<boolean>(
    !!expense && BUDGET_CATEGORIES.find((c) => c.id === expense.category)?.type !== expense.categoryType
  )

  const selectedCategory = getCategoryById(form.category)
  const effectiveCategoryType = overrideType ? form.categoryType : (selectedCategory?.type ?? "need")

  const handleCategoryChange = (categoryId: string) => {
    const cat = getCategoryById(categoryId)
    setForm((f) => ({
      ...f,
      category: categoryId,
      icon: cat?.defaultIcon ?? f.icon,
    }))
    // Reset override when category changes to use the new default
    setOverrideType(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateForm(
      { ...form, amount: form.amount ? parseFloat(form.amount) : 0 },
      {
        name: [commonRules.required("Expense name is required") as ValidationRule<unknown>],
        amount: [commonRules.positiveNumber("Amount must be greater than 0") as ValidationRule<unknown>],
        category: [commonRules.required("Category is required") as ValidationRule<unknown>],
      }
    )
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }
    setErrors({})
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="expense-name">Name</Label>
        <Input
          id="expense-name"
          placeholder="e.g. Car payment"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="expense-amount">Monthly Amount (£)</Label>
        <Input
          id="expense-amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="200"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category…" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Needs</div>
            {BUDGET_CATEGORIES.filter((c) => c.type === "need").map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-border mt-1 pt-1">Wants</div>
            {BUDGET_CATEGORIES.filter((c) => c.type === "want").map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}

        {/* Category type badge with override */}
        {form.category && (
          <div className="flex items-center gap-2 mt-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-xs gap-1",
                effectiveCategoryType === "need"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-purple-500 text-purple-600 dark:text-purple-400"
              )}
            >
              {effectiveCategoryType === "need" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {effectiveCategoryType === "need" ? "Need" : "Want"}
              {selectedCategory && !overrideType && (
                <span className="text-muted-foreground ml-0.5">— {selectedCategory.label}</span>
              )}
            </Badge>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              onClick={() => setOverrideType((v) => !v)}
            >
              {overrideType ? "Reset to default" : "Override classification"}
            </button>
          </div>
        )}

        {/* Override toggle */}
        {overrideType && form.category && (
          <div className="flex gap-2 mt-1.5">
            <Button
              type="button"
              size="sm"
              variant={form.categoryType === "need" ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setForm((f) => ({ ...f, categoryType: "need" }))}
            >
              <TrendingUp className="w-3 h-3" /> Need
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.categoryType === "want" ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setForm((f) => ({ ...f, categoryType: "want" }))}
            >
              <TrendingDown className="w-3 h-3" /> Want
            </Button>
          </div>
        )}
      </div>

      {/* Icon */}
      <div className="space-y-1.5">
        <Label>Icon</Label>
        <IconPickerDialog
          value={form.icon}
          onSelect={(icon) => setForm((f) => ({ ...f, icon }))}
        />
      </div>

      {/* Recurring */}
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="expense-recurring"
          checked={form.isRecurring}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, isRecurring: !!checked }))
          }
        />
        <Label htmlFor="expense-recurring" className="text-sm font-normal cursor-pointer">
          Recurring monthly expense
        </Label>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="expense-notes">Notes (optional)</Label>
        <Input
          id="expense-notes"
          placeholder="Any extra details…"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <LoadingSpinner message="" size="sm" />
          ) : expense ? (
            "Save Changes"
          ) : (
            "Add Expense"
          )}
        </Button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const expenses = useQuery(api.budget.budgetCrud.listExpenses)

  const createMutation = useMutation(api.budget.budgetCrud.createExpense)
  const updateMutation = useMutation(api.budget.budgetCrud.updateExpense)
  const deleteMutation = useMutation(api.budget.budgetCrud.deleteExpense)

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<BudgetExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetExpense | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Monthly income (take-home pay, stored in localStorage) ─────────────────
  const [monthlyIncome, setMonthlyIncome] = useState<string>("")
  useEffect(() => {
    setMonthlyIncome(localStorage.getItem("budget_monthlyIncome") ?? "")
  }, [])
  const income = parseFloat(monthlyIncome) || 0

  // ── Computed data ─────────────────────────────────────────────────────────
  const { needsTotal, wantsTotal, grandTotal, byCategory, categoryBreakdown } = useMemo(() => {
    if (!expenses) return { needsTotal: 0, wantsTotal: 0, grandTotal: 0, byCategory: [], categoryBreakdown: [] }

    const needs = expenses
      .filter((e) => e.categoryType === "need")
      .reduce((sum, e) => sum + e.amount, 0)
    const wants = expenses
      .filter((e) => e.categoryType === "want")
      .reduce((sum, e) => sum + e.amount, 0)

    const byCategory = [
      { name: "Needs", value: needs, color: "#3B82F6" },
      { name: "Wants", value: wants, color: "#8B5CF6" },
    ].filter((s) => s.value > 0)

    // Per-category breakdown within needs and wants
    const categoryTotals = new Map<string, number>()
    for (const e of expenses) {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount)
    }

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([catId, total]) => {
        const cat = getCategoryById(catId)
        return {
          categoryId: catId,
          name: cat?.label ?? catId,
          type: expenses.find((e) => e.category === catId)?.categoryType ?? "want",
          value: total,
        }
      })
      .sort((a, b) => b.value - a.value)

    return {
      needsTotal: needs,
      wantsTotal: wants,
      grandTotal: needs + wants,
      byCategory,
      categoryBreakdown,
    }
  }, [expenses])

  // ── Income % helpers ─────────────────────────────────────────────────────
  const pct = (value: number) => {
    if (!income) return null
    return (value / income) * 100
  }

  const needsBreakdown = useMemo(
    () => categoryBreakdown.filter((c) => c.type === "need"),
    [categoryBreakdown]
  )
  const wantsBreakdown = useMemo(
    () => categoryBreakdown.filter((c) => c.type === "want"),
    [categoryBreakdown]
  )

  const PieTooltip = PieChartTooltip({})

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = useCallback(
    async (form: NewExpenseForm) => {
      setIsSubmitting(true)
      await createMutation({
        name: form.name,
        amount: parseFloat(form.amount),
        category: form.category,
        categoryType: form.categoryType,
        isRecurring: form.isRecurring,
        icon: form.icon,
        notes: form.notes || undefined,
      })
      setIsSubmitting(false)
      setAddDialogOpen(false)
    },
    [createMutation]
  )

  const handleUpdate = useCallback(
    async (form: NewExpenseForm) => {
      if (!editExpense) return
      setIsSubmitting(true)
      await updateMutation({
        expenseId: editExpense._id,
        name: form.name,
        amount: parseFloat(form.amount),
        category: form.category,
        categoryType: form.categoryType,
        isRecurring: form.isRecurring,
        icon: form.icon,
        notes: form.notes || undefined,
      })
      setIsSubmitting(false)
      setEditExpense(null)
    },
    [editExpense, updateMutation]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteMutation({ expenseId: deleteTarget._id })
    setDeleteTarget(null)
  }, [deleteTarget, deleteMutation])

  // ── Loading / error ───────────────────────────────────────────────────────
  if (expenses === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner message="Loading budget…" />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AuthRequired>
    <div className="p-6 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Track your monthly expenses as Needs vs Wants
        </p>
      </div>

      {/* Controls row: income input + add button */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Monthly income input */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Take-home pay</span>
          <span className="text-muted-foreground">£</span>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="3000"
            value={monthlyIncome}
            onChange={(e) => {
              setMonthlyIncome(e.target.value)
              localStorage.setItem("budget_monthlyIncome", e.target.value)
            }}
            className="bg-transparent w-24 text-sm font-semibold outline-none tabular-nums"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">/mo</span>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>
                Add a monthly expense to your budget.
              </DialogDescription>
            </DialogHeader>
            <BudgetForm
              onSubmit={handleCreate}
              onCancel={() => setAddDialogOpen(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── Left column: expense list ────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground font-medium">Needs</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  £{needsTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {pct(needsTotal) !== null && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pct(needsTotal)!.toFixed(1)}% of income
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground font-medium">Wants</div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  £{wantsTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {pct(wantsTotal) !== null && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pct(wantsTotal)!.toFixed(1)}% of income
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground font-medium">Total</div>
                <div className="text-xl font-bold">
                  £{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {pct(grandTotal) !== null && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pct(grandTotal)!.toFixed(1)}% of income
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No expenses yet.</p>
                  <p className="text-xs mt-1">Add your first expense to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses
                    .slice()
                    .sort((a, b) => b.amount - a.amount)
                    .map((expense) => {
                      const cat = getCategoryById(expense.category)
                      const isNeed = expense.categoryType === "need"
                      return (
                        <div
                          key={expense._id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/40 transition-colors group"
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                              isNeed
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                                : "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                            )}
                          >
                            <IconDisplay name={expense.icon} className="w-4 h-4" />
                          </div>

                          {/* Name + category */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{expense.name}</div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{cat?.label ?? expense.category}</span>
                              <span className="opacity-40">·</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-4 px-1 gap-0.5 border-0",
                                  isNeed
                                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                                    : "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950"
                                )}
                              >
                                {isNeed ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {isNeed ? "Need" : "Want"}
                              </Badge>
                              {expense.isRecurring && (
                                <RefreshCw className="w-2.5 h-2.5 opacity-50" />
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-sm font-semibold tabular-nums text-right shrink-0">
                            £{expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {pct(expense.amount) !== null && (
                              <span className="block text-xs font-normal text-muted-foreground">
                                {pct(expense.amount)!.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit expense"
                              className="w-7 h-7"
                              onClick={() => setEditExpense(expense)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete expense"
                              className="w-7 h-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(expense)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: charts ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 sticky top-6">
          {/* Main Needs vs Wants donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Needs vs Wants</CardTitle>
            </CardHeader>
            <CardContent>
              {grandTotal === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <PieChart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Add expenses to see the chart</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={DONUT_INNER_RADIUS}
                        outerRadius={DONUT_OUTER_RADIUS}
                        paddingAngle={4}
                        cornerRadius={8}
                        dataKey="value"
                      >
                        {byCategory.map((entry, index) => (
                          <Cell key={index} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="space-y-2 mt-2">
                    {byCategory.map((item) => {
                      const ofTotal = grandTotal > 0 ? (item.value / grandTotal) * 100 : 0
                      const ofIncome = pct(item.value)
                      return (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums">
                              £{item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {ofTotal.toFixed(0)}% total
                              </span>
                              {ofIncome !== null && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {ofIncome.toFixed(1)}% income
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown: Needs */}
          {needsBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Needs Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {needsBreakdown.map((cat, i) => {
                  const pctOfNeeds = needsTotal > 0 ? (cat.value / needsTotal) * 100 : 0
                  const pctOfIncome = pct(cat.value)
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums">
                            £{cat.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground text-[10px]">({pctOfNeeds.toFixed(0)}% of needs)</span>
                          {pctOfIncome !== null && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium text-[10px]">
                              ({pctOfIncome.toFixed(1)}% income)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${pctOfNeeds}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Category breakdown: Wants */}
          {wantsBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Wants Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {wantsBreakdown.map((cat) => {
                  const pctOfWants = wantsTotal > 0 ? (cat.value / wantsTotal) * 100 : 0
                  const pctOfIncome = pct(cat.value)
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums">
                            £{cat.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground text-[10px]">({pctOfWants.toFixed(0)}% of wants)</span>
                          {pctOfIncome !== null && (
                            <span className="text-purple-600 dark:text-purple-400 font-medium text-[10px]">
                              ({pctOfIncome.toFixed(1)}% income)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all"
                          style={{ width: `${pctOfWants}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Edit dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!editExpense} onOpenChange={(open) => !open && setEditExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details of your expense.</DialogDescription>
          </DialogHeader>
          {editExpense && (
            <BudgetForm
              expense={editExpense}
              onSubmit={handleUpdate}
              onCancel={() => setEditExpense(null)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AuthRequired>
  )
}
