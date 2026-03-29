"use client"

import { Card } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function AssumptionsCard() {
  return (
    <Card className="overflow-hidden">
      <Accordion type="single" collapsible className="w-full border-0">
        <AccordionItem value="assumptions" className="border-b-0">
          <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 px-6 py-4">
            <span className="font-semibold">Model Assumptions</span>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">Pension:</span> 25% tax-free lump sum, remaining 75% taxed as income</li>
              <li><span className="font-medium text-foreground">ISA:</span> Completely tax-free withdrawals (contributions already taxed)</li>
              <li><span className="font-medium text-foreground">GIA:</span> Entire withdrawal treated as taxable income (simplified)</li>
              <li>Growth is applied annually before withdrawals</li>
              <li>Withdrawals are taken proportionally from each account</li>
              <li>State pension begins at the specified age and continues for life</li>
              <li>All figures are in today&apos;s pounds (inflation not explicitly modeled)</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="limitations" className="border-b-0">
          <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 py-4">
            <span className="font-semibold">Limitations</span>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
              <li>Market volatility is not modeled - returns are assumed constant</li>
              <li>Sequence of returns risk is not accounted for</li>
              <li>Tax rates may change in future years</li>
              <li>State pension age and amount may change</li>
              <li>GIA calculation is simplified - only gains should be taxed, not original contributions</li>
              <li>ISA allowance limits not considered</li>
              <li>No allowance for investment fees or advice costs</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="disclaimer" className="border-b-0">
          <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 py-4">
            <span className="font-semibold">Important Disclaimer</span>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This calculator provides illustrative projections based on the assumptions you enter.
              It is not financial advice and should not be used as the sole basis for retirement decisions.
              Results are not guaranteed and your actual outcomes may differ significantly.
              Please consult a qualified financial adviser for personalized advice.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}