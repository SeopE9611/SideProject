// MaterialFilter.tsx
"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { stringMaterialLabel } from "@/lib/constants";
import { Filter } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[]; // ex) ["polyester", "multifilament", ...]
}

export default function MaterialFilter({ value, onChange, options }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="재질 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">재질 전체</SelectItem>
        {options.map((m) => (
          <SelectItem key={m} value={m}>
            {stringMaterialLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
