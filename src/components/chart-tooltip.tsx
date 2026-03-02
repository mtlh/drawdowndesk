"use client";

import { TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  className?: string;
  formatter?: (value: number, name: string) => React.ReactNode;
  labelFormatter?: (label: string) => string;
}

/**
 * Reusable chart tooltip component for consistent styling across all charts.
 * Provides a card-styled tooltip matching the app's design system.
 */
export function ChartTooltip(props?: ChartTooltipProps) {
  const {
    className,
    formatter,
    labelFormatter,
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

    const formattedLabel = labelFormatter ? labelFormatter(label) : label;
    const formattedValue =
      formatter && payload[0].value !== undefined
        ? formatter(payload[0].value, payload[0].name || "")
        : `£${payload[0].value?.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;

    return (
      <div
        className={cn(
          "bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm",
          className
        )}
      >
        {formattedLabel && (
          <div className="font-semibold text-muted-foreground">
            {formattedLabel}
          </div>
        )}
        <div>
          <span className="font-medium">{payload[0].name}</span>
          <span className="text-muted-foreground">: </span>
          {formattedValue}
        </div>
        {payload.length > 1 &&
          payload.slice(1).map((entry, index) => (
            <div key={index}>
              <span className="font-medium">{entry.name}</span>
              <span className="text-muted-foreground">: </span>
              {formatter
                ? formatter(entry.value || 0, entry.name || "")
                : `£${(entry.value || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
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
