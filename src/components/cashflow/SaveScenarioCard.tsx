"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, GitCompare } from "lucide-react"

interface SaveScenarioCardProps {
  pensionValue: number
  isaValue: number
  giaValue: number
  startAge: number
  growthRate: number
  withdrawalRate: number
  onSave: (name: string, description: string) => Promise<void>
}

export function SaveScenarioCard({
  pensionValue,
  isaValue,
  giaValue,
  startAge,
  growthRate,
  withdrawalRate,
  onSave,
}: SaveScenarioCardProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [scenarioName, setScenarioName] = useState("")
  const [scenarioDescription, setScenarioDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!scenarioName.trim()) return
    setIsSaving(true)
    try {
      await onSave(scenarioName.trim(), scenarioDescription.trim())
      setSaveDialogOpen(false)
      setScenarioName("")
      setScenarioDescription("")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Save this forecast as a scenario?</p>
            <p className="text-sm text-muted-foreground">Save your current settings to compare different retirement strategies</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/what-if-scenarios">
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Scenarios
              </a>
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Save className="w-4 h-4 mr-2" />
                  Save Scenario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Scenario</DialogTitle>
                  <DialogDescription>
                    Save your current settings as a named scenario
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenarioName">Scenario Name</Label>
                    <Input
                      id="scenarioName"
                      placeholder="e.g., Retire at 55"
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scenarioDescription">Description (optional)</Label>
                    <Input
                      id="scenarioDescription"
                      placeholder="e.g., Lower pension, earlier retirement"
                      value={scenarioDescription}
                      onChange={(e) => setScenarioDescription(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    <p className="font-medium mb-1">Current settings:</p>
                    <p>Pension: £{pensionValue.toLocaleString()} | ISA: £{isaValue.toLocaleString()} | GIA: £{giaValue.toLocaleString()}</p>
                    <p>Start Age: {startAge} | Growth: {growthRate}% | Withdrawal: {withdrawalRate}%</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!scenarioName.trim() || isSaving}>
                    {isSaving ? "Saving..." : "Save Scenario"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}