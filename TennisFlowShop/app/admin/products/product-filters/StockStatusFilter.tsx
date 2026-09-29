"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface Props {
  value: string; // 'all' | 'active' | 'low_stock' | 'out_of_stock'
  onChange: (value: string) => void;
}
export default function StockStatusFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-full", adminTypography.body)}>
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="상품 상태 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">상품 상태 전체</SelectItem>
        <SelectItem value="active">판매중</SelectItem>
        <SelectItem value="low_stock">재고 부족</SelectItem>
        <SelectItem value="out_of_stock">품절</SelectItem>
      </SelectContent>
    </Select>
  );
}
