"use client";

import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/toast";
import { useState } from "react";

export default function PortfolioDemoCustomerReturnButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0 text-ui-label font-semibold text-foreground"
      disabled={loading}
      onClick={async () => {
        if (loading) return;
        setLoading(true);
        try {
          const response = await fetch("/api/portfolio-demo/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: "customer" }),
          });
          if (!response.ok) throw new Error("고객 데모로 돌아가지 못했습니다.");
          window.location.assign("/");
        } catch (error) {
          setLoading(false);
          showErrorToast(error instanceof Error ? error.message : "고객 데모로 돌아가지 못했습니다.");
        }
      }}
    >
      {loading ? "전환 중..." : "고객 데모로 돌아가기"}
    </Button>
  );
}
