"use client";

import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";

type FormattedNumberInputProps = Omit<
  InputProps,
  "type" | "inputMode" | "value" | "onChange" | "min" | "max" | "step"
> & {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  emptyValue?: number;
  selectOnFocus?: boolean;
  normalizeToStepOnBlur?: boolean;
};

const toDigits = (value: string) => value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");

const formatNumber = (value: number | null | undefined) => {
  if (value == null) return "";

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";

  return Math.max(0, Math.floor(numeric)).toLocaleString("ko-KR");
};

const FormattedNumberInput = React.forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  (
    {
      value,
      onValueChange,
      min,
      max,
      step,
      emptyValue = 0,
      selectOnFocus = true,
      normalizeToStepOnBlur = false,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [text, setText] = React.useState(() => formatNumber(value));

    React.useEffect(() => {
      if (isFocused) return;
      setText(formatNumber(value));
    }, [value, isFocused]);

    const normalize = React.useCallback(
      (raw: number, applyStep: boolean) => {
        let next = Number.isFinite(raw) ? Math.floor(raw) : emptyValue;

        if (typeof min === "number") next = Math.max(min, next);
        if (typeof max === "number") next = Math.min(max, next);

        if (applyStep && normalizeToStepOnBlur && typeof step === "number" && step > 0) {
          next = Math.floor(next / step) * step;
          if (typeof min === "number") next = Math.max(min, next);
          if (typeof max === "number") next = Math.min(max, next);
        }

        return next;
      },
      [emptyValue, max, min, normalizeToStepOnBlur, step],
    );

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={text}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);

          if (!selectOnFocus) return;

          const input = event.currentTarget;
          requestAnimationFrame(() => {
            input.select();
          });
        }}
        onChange={(event) => {
          const digits = toDigits(event.target.value);

          if (!digits) {
            setText("");
            onValueChange(normalize(emptyValue, false));
            return;
          }

          const next = normalize(Number(digits), false);
          setText(formatNumber(next));
          onValueChange(next);
        }}
        onBlur={(event) => {
          setIsFocused(false);

          const digits = toDigits(event.currentTarget.value);
          const next = digits ? normalize(Number(digits), true) : normalize(emptyValue, true);

          setText(formatNumber(next));
          onValueChange(next);
          onBlur?.(event);
        }}
      />
    );
  },
);

FormattedNumberInput.displayName = "FormattedNumberInput";

export { FormattedNumberInput };
