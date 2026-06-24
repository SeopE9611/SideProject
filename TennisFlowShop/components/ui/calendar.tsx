"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
} & Omit<React.ComponentProps<typeof DayPicker>, "mode" | "selected" | "onSelect">;

export function Calendar({ selected, onSelect, className, ...props }: CalendarProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-ui-body-sm shadow-md",
        "overflow-visible",
        className,
      )}
    >
      <DayPicker
        mode="single"
        showOutsideDays
        selected={selected}
        onSelect={onSelect}
        className="m-0 p-2"
        {...props}
      />
    </div>
  );
}
