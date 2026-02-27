"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Target, Calendar, TrendingUp, CheckCircle2, Clock, Edit2, Trash2 } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

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
  lastUpdated?: string
}

export default function GoalTracker() {
  const goals = useQuery(api.goals.goalCrud.getGoals)
  const createGoal = useMutation(api.goals.goalCrud.createGoal)
  const updateGoal = useMutation(api.goals.goalCrud.updateGoal)
  const deleteGoal = useMutation(api.goals.goalCrud.deleteGoal)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: 0,
    currentAmount: 0,
    targetDate: "",
    category: "other",
    notes: "",
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

  const handleCreateGoal = async () => {
    await createGoal({
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount,
      targetDate: newGoal.targetDate,
      category: newGoal.category,
      notes: newGoal.notes || undefined,
    })
    setNewGoal({
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "other",
      notes: "",
    })
    setIsDialogOpen(false)
  }

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
    })
    setEditingGoal(null)
  }

  const handleDeleteGoal = async (goalId: Id<"goals">) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      await deleteGoal({ goalId })
    }
  }

  const handleUpdateCurrentAmount = async (goal: Goal, newAmount: number) => {
    await updateGoal({
      goalId: goal._id,
      currentAmount: newAmount,
    })
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
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              Goal Tracker
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Set financial goals and track your progress towards achieving them.
              See how much you need to save each month to reach your targets.
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p>Loading goals...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Saved</CardDescription>
                    <CardTitle className="text-2xl">£{totalSaved.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Target</CardDescription>
                    <CardTitle className="text-2xl">£{totalTarget.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Overall Progress</CardDescription>
                    <CardTitle className="text-2xl">
                      {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Add Goal Button */}
              <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
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
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Goal Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Wedding Fund"
                          value={newGoal.name}
                          onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newGoal.category}
                          onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
                        >
                          <SelectTrigger>
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
                            onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentAmount">Current Amount (£)</Label>
                          <Input
                            id="currentAmount"
                            type="number"
                            placeholder="0"
                            value={newGoal.currentAmount || ""}
                            onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={newGoal.targetDate}
                          onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                        />
                      </div>
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

              {/* Goals Tabs */}
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active Goals ({activeGoals.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedGoals.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 mt-6">
                  {activeGoals.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No active goals yet. Create your first goal to start tracking!</p>
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
                          <Card key={goal._id} className={isOverdue ? "border-destructive" : ""}>
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingGoal(goal)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDeleteGoal(goal._id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <CardDescription className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {isOverdue ? (
                                  <span className="text-destructive">Overdue by {Math.abs(daysRemaining)} days</span>
                                ) : daysRemaining === 0 ? (
                                  <span>Due today!</span>
                                ) : (
                                  <span>{daysRemaining} days remaining</span>
                                )}
                              </CardDescription>
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

                              {/* Quick add to goal */}
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Add to goal..."
                                  className="h-8"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const value = Number((e.target as HTMLInputElement).value)
                                      if (value > 0) {
                                        handleUpdateCurrentAmount(goal, goal.currentAmount + value)
                                        ;(e.target as HTMLInputElement).value = ""
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.querySelector(`#goal-${goal._id}`) as HTMLInputElement
                                    if (input && Number(input.value) > 0) {
                                      handleUpdateCurrentAmount(goal, goal.currentAmount + Number(input.value))
                                      input.value = ""
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
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
                        <Card key={goal._id} className="border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                                <CardTitle className="text-lg">{goal.name}</CardTitle>
                              </div>
                              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-1">
                              Completed on {goal.completedDate}
                            </CardDescription>
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
                    <div className="space-y-4 py-4">
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
                          <SelectTrigger>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
