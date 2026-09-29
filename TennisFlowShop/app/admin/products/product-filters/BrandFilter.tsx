// BrandFilter.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import { stringBrandLabel } from "@/lib/constants";
import { Filter } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[]; // ex) ["babolat", "wilson", "head"]
}

export default function BrandFilter({ value, onChange, options }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-full", adminTypography.body)}>
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="브랜드 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">브랜드 전체</SelectItem>
        {options.map((b) => (
          <SelectItem key={b} value={b}>
            {stringBrandLabel(b)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
