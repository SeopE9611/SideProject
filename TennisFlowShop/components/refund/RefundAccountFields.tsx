"use client";

import RefundBankCombobox from "@/components/refund/RefundBankCombobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RefundAccountFieldsProps = {
  bank: string;
  account: string;
  holder: string;
  onBankChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onHolderChange: (value: string) => void;
  disabled?: boolean;
  description?: string;
};

export default function RefundAccountFields({
  bank,
  account,
  holder,
  onBankChange,
  onAccountChange,
  onHolderChange,
  disabled = false,
  description,
}: RefundAccountFieldsProps) {
  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">환불 계좌 정보</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>환불 은행</Label>
        <RefundBankCombobox
          value={bank}
          onChange={onBankChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>환불 계좌번호</Label>
        <Input
          value={account}
          onChange={(e) => onAccountChange(e.target.value)}
          disabled={disabled}
          placeholder="숫자만 8~20자리 입력"
        />
      </div>

      <div className="space-y-2">
        <Label>예금주</Label>
        <Input
          value={holder}
          onChange={(e) => onHolderChange(e.target.value)}
          disabled={disabled}
          placeholder="예금주명 2자 이상 입력"
        />
      </div>
    </div>
  );
}
