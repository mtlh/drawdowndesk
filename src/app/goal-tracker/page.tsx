"use client"

import { useState } from "react"
import { getPriceInPounds } from "@/lib/utils"
import { validateForm, commonRules, ValidationRule } from "@/lib/validation"
import { PortfolioWithHoldings } from "@/types/portfolios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Target, Calendar, TrendingUp, CheckCircle2, Clock, Edit2, Trash2, Link2 } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Goal {
  _id: Id<"goals">
  _creationTime: number
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category?: string
  notes?: string
  isCompleted: boolean
  completedDate?: string
  linkedPortfolioId?: Id<"portfolios">
  autoSyncPortfolio?: boolean
  portfolioValue?: number | null
  portfolioName?: string | null
  lastUpdated?: string
}

export default function GoalTracker() {
  const goals = useQuery(api.goals.goalCrud.getGoalsWithPortfolio)
  const portfolios = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio)
  const createGoal = useMutation(api.goals.goalCrud.createGoal)
  const updateGoal = useMutation(api.goals.goalCrud.updateGoal)
  const deleteGoal = useMutation(api.goals.goalCrud.deleteGoal)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [goalErrors, setGoalErrors] = useState<Record<string, string>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"goals"> | null>(null)
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: 0,
    currentAmount: 0,
    targetDate: "",
    category: "other",
    notes: "",
    linkedPortfolioId: undefined as Id<"portfolios"> | undefined,
    autoSyncPortfolio: false,
  })

  const isLoading = goals === undefined

  // Calculate progress and time remaining for each goal
  const calculateProgress = (goal: Goal) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    return Math.round(progress)
  }

  const calculateDaysRemaining = (targetDate: string) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateMonthlyNeeded = (goal: Goal) => {
    const daysRemaining = calculateDaysRemaining(goal.targetDate)
    if (daysRemaining <= 0) return 0
    const amountRemaining = goal.targetAmount - goal.currentAmount
    const monthsRemaining = daysRemaining / 30
    return amountRemaining > 0 ? amountRemaining / monthsRemaining : 0
  }

  // Helper function to calculate portfolio total value in GBP
  const getPortfolioTotalValue = (portfolio: PortfolioWithHoldings | undefined): number => {
    if (!portfolio) return 0
    let total = 0

    // Add live holdings value (shares * currentPrice), converted to GBP
    if (portfolio.holdings) {
      for (const holding of portfolio.holdings) {
        const holdingValue = (holding.shares || 0) * (holding.currentPrice || 0)
        total += getPriceInPounds(holdingValue, holding.currency)
      }
    }

    // Add simple holdings value (already in GBP per schema)
    if (portfolio.simpleHoldings) {
      for (const holding of portfolio.simpleHoldings) {
        total += holding.value || 0
      }
    }

    return total
  }

  const handleCreateGoal = async () => {
    const validation = validateForm(newGoal, {
      name: [commonRules.required("Goal name is required") as ValidationRule<unknown>, commonRules.minLength(2) as ValidationRule<unknown>],
      targetAmount: [commonRules.positiveNumber("Target amount must be greater than 0") as ValidationRule<unknown>],
      currentAmount: [commonRules.nonNegativeNumber("Current amount cannot be negative") as ValidationRule<unknown>],
      targetDate: [commonRules.required("Target date is required") as ValidationRule<unknown>, commonRules.futureDate("Target date must be in the future") as ValidationRule<unknown>],
    });

    if (!validation.isValid) {
      setGoalErrors(validation.errors);
      return;
    }

    setGoalErrors({});
    
    await createGoal({
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount,
      targetDate: newGoal.targetDate,
      category: newGoal.category,
      notes: newGoal.notes || undefined,
      linkedPortfolioId: newGoal.linkedPortfolioId,
      autoSyncPortfolio: newGoal.autoSyncPortfolio,
    })
    setNewGoal({
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "other",
      notes: "",
      linkedPortfolioId: undefined,
      autoSyncPortfolio: false,
    })
    setIsDialogOpen(false)
  }

  const clearGoalError = (field: string) => {
    if (goalErrors[field]) {
      setGoalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal) return
    await updateGoal({
      goalId: editingGoal._id,
      name: editingGoal.name,
      targetAmount: editingGoal.targetAmount,
      currentAmount: editingGoal.currentAmount,
      targetDate: editingGoal.targetDate,
      category: editingGoal.category,
      notes: editingGoal.notes,
      linkedPortfolioId: editingGoal.linkedPortfolioId,
      autoSyncPortfolio: editingGoal.autoSyncPortfolio,
    })
    setEditingGoal(null)
  }

  const confirmDeleteGoal = (goalId: Id<"goals">) => {
    setDeleteTargetId(goalId)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    await deleteGoal({ goalId: deleteTargetId })
    setDeleteConfirmOpen(false)
    setDeleteTargetId(null)
  }

  const categories = [
    { value: "wedding", label: "Wedding", icon: "💒" },
    { value: "house", label: "House Deposit", icon: "🏠" },
    { value: "car", label: "Car", icon: "🚗" },
    { value: "holiday", label: "Holiday", icon: "✈️" },
    { value: "emergency", label: "Emergency Fund", icon: "🛡️" },
    { value: "retirement", label: "Retirement", icon: "🏖️" },
    { value: "other", label: "Other", icon: "🎯" },
  ]

  const getCategoryIcon = (category?: string) => {
    return categories.find(c => c.value === category)?.icon || "🎯"
  }

  const activeGoals = goals?.filter(g => !g.isCompleted) || []
  const completedGoals = goals?.filter(g => g.isCompleted) || []

  const totalSaved = goals?.reduce((sum, g) => sum + g.currentAmount, 0) || 0
  const totalTarget = goals?.reduce((sum, g) => sum + g.targetAmount, 0) || 0

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">

          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <LoadingSpinner message="Loading goals..." />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header Section with Stats */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Goals Overview Display */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/20">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Total Saved</div>
                    <div className="text-4xl font-bold tracking-tight">
                      £{totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {totalTarget > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-600">
                            {Math.round((totalSaved / totalTarget) * 100)}%
                          </span>
                          <span className="text-sm text-muted-foreground">of £{totalTarget.toLocaleString()} target</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No goals set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200/50 dark:border-violet-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Active</span>
                    </div>
                    <div className="text-2xl font-bold">{activeGoals.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                    </div>
                    <div className="text-2xl font-bold">{completedGoals.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Target</span>
                    </div>
                    <div className="text-2xl font-bold">£{totalTarget.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Remaining</span>
                    </div>
                    <div className="text-2xl font-bold">£{(totalTarget - totalSaved).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </div>

              {/* Filter and Add Goal - full width row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="active">
                      Active ({activeGoals.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      Completed ({completedGoals.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  if (!open) setGoalErrors({});
                  setIsDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Goal
                    </Button>
                  </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Goal</DialogTitle>
                          <DialogDescription>
                            Set up a new financial goal to track your progress.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">Goal Name</Label>
                            <Input
                              id="name"
                              placeholder="e.g., Wedding Fund"
                              value={newGoal.name}
                              onChange={(e) => {
                                setNewGoal({ ...newGoal, name: e.target.value });
                                clearGoalError("name");
                              }}
                              className={goalErrors.name ? "border-destructive" : ""}
                            />
                            {goalErrors.name && <p className="text-xs text-destructive">{goalErrors.name}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                              value={newGoal.category}
                              onValueChange={(value) => {
                                setNewGoal({ ...newGoal, category: value });
                                clearGoalError("category");
                              }}
                            >
                              <SelectTrigger aria-label="Select category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="targetAmount">Target Amount (£)</Label>
                              <Input
                                id="targetAmount"
                                type="number"
                                placeholder="30000"
                                value={newGoal.targetAmount || ""}
                                onChange={(e) => {
                                  setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) || 0 });
                                  clearGoalError("targetAmount");
                                }}
                                className={goalErrors.targetAmount ? "border-destructive" : ""}
                              />
                              {goalErrors.targetAmount && <p className="text-xs text-destructive">{goalErrors.targetAmount}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="currentAmount">Current Amount (£)</Label>
                              <Input
                                id="currentAmount"
                                type="number"
                                placeholder="0"
                                value={newGoal.currentAmount || ""}
                                onChange={(e) => {
                                  setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) || 0 });
                                  clearGoalError("currentAmount");
                                }}
                                className={goalErrors.currentAmount ? "border-destructive" : ""}
                              />
                              {goalErrors.currentAmount && <p className="text-xs text-destructive">{goalErrors.currentAmount}</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="targetDate">Target Date</Label>
                            <Input
                              id="targetDate"
                              type="date"
                              value={newGoal.targetDate}
                              onChange={(e) => {
                                setNewGoal({ ...newGoal, targetDate: e.target.value });
                                clearGoalError("targetDate");
                              }}
                              className={goalErrors.targetDate ? "border-destructive" : ""}
                            />
                            {goalErrors.targetDate && <p className="text-xs text-destructive">{goalErrors.targetDate}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="linkedPortfolio">Link to Portfolio (optional)</Label>
                            <Select
                              value={newGoal.linkedPortfolioId || "none"}
                              onValueChange={(value) => setNewGoal({ ...newGoal, linkedPortfolioId: value === "none" ? undefined : value as Id<"portfolios"> })}
                            >
                              <SelectTrigger aria-label="Select portfolio to track">
                                <SelectValue placeholder="Select a portfolio to track" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (manual tracking)</SelectItem>
                                {Array.isArray(portfolios) && portfolios.map((portfolio) => (
                                  <SelectItem key={portfolio._id} value={portfolio._id}>
                                    {portfolio.name} (£{getPortfolioTotalValue(portfolio).toLocaleString()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {newGoal.linkedPortfolioId && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="autoSync"
                                checked={newGoal.autoSyncPortfolio}
                                onChange={(e) => setNewGoal({ ...newGoal, autoSyncPortfolio: e.target.checked })}
                                className="h-4 w-4"
                              />
                              <Label htmlFor="autoSync" className="text-sm font-normal">
                                Auto-sync portfolio value to currentAmount
                              </Label>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Input
                              id="notes"
                              placeholder="Any additional notes..."
                              value={newGoal.notes}
                              onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleCreateGoal} className="w-full">
                            Create Goal
                          </Button>
                        </div>
                      </DialogContent>
                </Dialog>
              </div>

              <Tabs defaultValue="active">
                <TabsContent value="active" className="space-y-4 mt-6">
              {activeGoals.length === 0 ? (
                      <Card>
                        <CardContent className="py-16 text-center">
                          <div className="flex flex-col items-center max-w-sm mx-auto">
                            <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                              <Target className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                            </div>
                            <p className="text-lg font-semibold mb-2">No active goals yet</p>
                            <p className="text-sm text-muted-foreground mb-6">Create your first goal to start tracking your progress!</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeGoals.map((goal) => {
                          const progress = calculateProgress(goal)
                          const daysRemaining = calculateDaysRemaining(goal.targetDate)
                          const monthlyNeeded = calculateMonthlyNeeded(goal)
                          const isOverdue = daysRemaining < 0

                          return (
                            <Card key={goal._id} className={`overflow-hidden ${isOverdue ? "border-destructive" : "hover:border-violet-200 dark:hover:border-violet-800 transition-colors"}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">
                                      {getCategoryIcon(goal.category)}
                                    </div>
                                    <div>
                                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                                      <CardDescription className="flex items-center gap-1 mt-0.5">
                                        <Calendar className="h-3 w-3" />
                                        {isOverdue ? (
                                          <span className="text-destructive">Overdue by {Math.abs(daysRemaining)} days</span>
                                        ) : daysRemaining === 0 ? (
                                          <span>Due today!</span>
                                        ) : (
                                          <span>{daysRemaining} days remaining</span>
                                        )}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setEditingGoal(goal)}
                                      aria-label="Edit goal"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => confirmDeleteGoal(goal._id)}
                                      aria-label="Delete goal"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      £{goal.currentAmount.toLocaleString()} / £{goal.targetAmount.toLocaleString()}
                                    </span>
                                    <span className="font-medium">{progress}%</span>
                                  </div>
                                  <Progress
                                    value={progress}
                                    className="h-3"
                                    indicatorClassName={progress >= 100 ? "bg-emerald-500" : undefined}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>£{monthlyNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>£{(goal.targetAmount - goal.currentAmount).toLocaleString()} to go</span>
                                  </div>
                                </div>

                                {/* Linked Portfolio Info */}
                                {goal.linkedPortfolioId && (
                                  <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/50 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Link2 className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                      <span className="font-medium">{goal.portfolioName}</span>
                                      {goal.autoSyncPortfolio && (
                                        <Badge variant="outline" className="text-xs ml-auto">Auto-syncs</Badge>
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Portfolio Value: </span>
                                      <span className="font-medium">£{(goal.portfolioValue || 0).toLocaleString()}</span>
                                    </div>
                                    {goal.portfolioValue !== undefined && goal.portfolioValue !== null && (
                                      <div className="text-xs text-muted-foreground">
                                        {goal.portfolioValue >= goal.targetAmount ? (
                                          <span className="text-emerald-600">Portfolio exceeds target by £{(goal.portfolioValue - goal.targetAmount).toLocaleString()}</span>
                                        ) : (
                                          <span>Portfolio is £{(goal.targetAmount - goal.portfolioValue).toLocaleString()} below target</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="space-y-4 mt-6">
                    {completedGoals.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No completed goals yet. Keep saving!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completedGoals.map((goal) => (
                          <Card key={goal._id} className="border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">
                                    {getCategoryIcon(goal.category)}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1 mt-0.5">
                                      Completed on {goal.completedDate}
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Final amount</span>
                                <span className="font-medium">£{goal.targetAmount.toLocaleString()}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

              {/* Edit Goal Dialog */}
              <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Goal</DialogTitle>
                  </DialogHeader>
                  {editingGoal && (
                    <div className="space-y-5 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="editName">Goal Name</Label>
                        <Input
                          id="editName"
                          value={editingGoal.name}
                          onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editCategory">Category</Label>
                        <Select
                          value={editingGoal.category || "other"}
                          onValueChange={(value) => setEditingGoal({ ...editingGoal, category: value })}
                        >
                          <SelectTrigger aria-label="Select category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editTargetAmount">Target Amount (£)</Label>
                          <Input
                            id="editTargetAmount"
                            type="number"
                            value={editingGoal.targetAmount}
                            onChange={(e) => setEditingGoal({ ...editingGoal, targetAmount: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editCurrentAmount">Current Amount (£)</Label>
                          <Input
                            id="editCurrentAmount"
                            type="number"
                            value={editingGoal.currentAmount}
                            onChange={(e) => setEditingGoal({ ...editingGoal, currentAmount: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editTargetDate">Target Date</Label>
                        <Input
                          id="editTargetDate"
                          type="date"
                          value={editingGoal.targetDate}
                          onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editLinkedPortfolio">Link to Portfolio</Label>
                        <Select
                          value={editingGoal.linkedPortfolioId || "none"}
                          onValueChange={(value) => setEditingGoal({ ...editingGoal, linkedPortfolioId: value === "none" ? undefined : value as Id<"portfolios"> })}
                        >
                          <SelectTrigger aria-label="Select portfolio to track">
                            <SelectValue placeholder="Select a portfolio to track" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (manual tracking)</SelectItem>
                            {Array.isArray(portfolios) && portfolios.map((portfolio) => (
                              <SelectItem key={portfolio._id} value={portfolio._id}>
                                {portfolio.name} (£{getPortfolioTotalValue(portfolio).toLocaleString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {editingGoal.linkedPortfolioId && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="editAutoSync"
                            checked={editingGoal.autoSyncPortfolio || false}
                            onChange={(e) => setEditingGoal({ ...editingGoal, autoSyncPortfolio: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="editAutoSync" className="text-sm font-normal">
                            Auto-sync portfolio value to currentAmount
                          </Label>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="editNotes">Notes</Label>
                        <Input
                          id="editNotes"
                          value={editingGoal.notes || ""}
                          onChange={(e) => setEditingGoal({ ...editingGoal, notes: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleUpdateGoal} className="w-full">
                        Save Changes
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                  </AlertDialogHeader>
                  <p className="text-muted-foreground">Are you sure you want to delete this goal? This action cannot be undone.</p>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
