"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { REFUND_BANK_CATALOG } from "@/lib/refund-bank-catalog";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type RefundBankComboboxProps = {
  value: string;
  onChange: (nextCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

export default function RefundBankCombobox({
  value,
  onChange,
  placeholder = "은행을 검색해 선택하세요",
  disabled = false,
}: RefundBankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const resetSearchState = () => {
    setQuery("");
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const selectedItem =
    REFUND_BANK_CATALOG.find((bank) => bank.code === value) ?? null;

  const filteredBanks = useMemo(() => {
    const q = normalize(query);
    if (!q) return REFUND_BANK_CATALOG;

    return REFUND_BANK_CATALOG.filter((bank) => {
      if (normalize(bank.label).includes(q)) return true;
      return bank.keywords.some((keyword) => normalize(keyword).includes(q));
    });
  }, [query]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetSearchState();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selectedItem?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-2"
        align="start"
        portalled={false}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="은행명/키워드 검색"
          className="mb-2"
          autoFocus
        />

        <div
          ref={listRef}
          className="max-h-64 overflow-y-auto rounded-md border border-border/60"
        >
          {filteredBanks.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}

          {filteredBanks.map((bank) => (
            <button
              key={bank.code}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange(bank.code);
                setOpen(false);
              }}
            >
              <span>{bank.label}</span>
              <Check
                className={cn(
                  "h-4 w-4 text-primary",
                  value === bank.code ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
