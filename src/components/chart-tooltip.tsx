"use client";

import { TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  className?: string;
  formatter?: (value: number, name: string) => React.ReactNode;
  labelFormatter?: (label: string) => string;
  showChange?: boolean;
  previousValue?: number;
}

/**
 * Enhanced chart tooltip component for consistent styling across all charts.
 * Provides detailed breakdowns including value, change, and percentage change.
 */
export function ChartTooltip(props?: ChartTooltipProps) {
  const {
    className,
    formatter,
    labelFormatter,
    showChange = false,
    previousValue,
  } = props || {}
  return function TooltipContent({
    active,
    payload,
    label,
    // Recharts passes these props but we don't need them - capture to prevent DOM warnings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tooltipPayload: _tooltipPayload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tooltipPosition: _tooltipPosition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataKey: _dataKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._rest
  }: TooltipProps<number, string> & { tooltipPayload?: unknown; tooltipPosition?: unknown; dataKey?: unknown }) {
    if (!active || !payload?.length) return null;

    const currentValue = payload[0].value as number;
    const formattedLabel = labelFormatter ? labelFormatter(label) : label;
    
    // Calculate change if we have previous value
    const change = previousValue !== undefined ? currentValue - previousValue : undefined;
    const changePercent = change !== undefined && previousValue ? (change / previousValue) * 100 : undefined;
    
    const formattedValue = formatter
      ? formatter(currentValue, payload[0].name || "")
      : `£${currentValue?.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

    return (
      <div
        className={cn(
          "bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm min-w-[180px]",
          className
        )}
      >
        {formattedLabel && (
          <div className="font-semibold text-muted-foreground border-b border-border pb-1.5 mb-1.5">
            {formattedLabel}
          </div>
        )}
        
        {/* Main value */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{payload[0].name || "Value"}</span>
          <span className="font-semibold">{formattedValue}</span>
        </div>
        
        {/* Change indicators */}
        {showChange && change !== undefined && (
          <>
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-muted-foreground">Change</span>
              <span className={cn(
                "font-medium",
                change >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {change >= 0 ? "+" : ""}£{Math.abs(change).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {changePercent !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Change %</span>
                <span className={cn(
                  "font-medium",
                  changePercent >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </>
        )}
        
        {/* Additional values */}
        {payload.length > 1 &&
          payload.slice(1).map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mt-1">
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="font-medium">
                {formatter
                  ? formatter(entry.value || 0, entry.name || "")
                  : `£${(entry.value || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </span>
            </div>
          ))}
      </div>
    );
  };
}

/**
 * Simple pie chart tooltip for name/value display (e.g., portfolio allocation)
 */
export function PieChartTooltip(props?: { className?: string }) {
  const { className } = props || {}
  return function TooltipContent({
    active,
    payload,
    // Recharts passes these props but we don't need them - capture to prevent DOM warnings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tooltipPayload: _tooltipPayload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tooltipPosition: _tooltipPosition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataKey: _dataKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._rest
  }: TooltipProps<number, string> & { tooltipPayload?: unknown; tooltipPosition?: unknown; dataKey?: unknown }) {
    if (!active || !payload?.length) return null;

    const { name, value } = payload[0].payload;

    return (
      <div
        className={cn(
          "bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm",
          className
        )}
      >
        <div className="font-semibold">{name}</div>
        <div>
          £
          {value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    );
  };
}
