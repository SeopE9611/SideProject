"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";

interface Props {
  initialData: string;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequestEditForm({ initialData, orderId, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState(initialData);
  const [baseline, setBaseline] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const isDirty = value !== baseline;
  useUnsavedChangesGuard(isDirty);

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryRequest: value }),
      credentials: "include",
    });
    setLoading(false);
    if (res.ok) {
      setBaseline(value);
      onSuccess();
    } else alert("저장에 실패했습니다.");
  };

  return (
    <>
      <CardContent>
        <Textarea
          className="w-full"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 bp-sm:flex-row bp-sm:justify-end">
        <Button variant="outline" className="min-h-11 w-full bp-sm:w-auto" onClick={onCancel}>
          취소
        </Button>
        <Button variant="highlight" className="min-h-11 w-full bp-sm:w-auto" onClick={handleSave} disabled={loading}>
          {loading ? "저장 중…" : "저장"}
        </Button>
      </CardFooter>
    </>
  );
}
