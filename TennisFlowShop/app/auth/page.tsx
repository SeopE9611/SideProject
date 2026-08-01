"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthGatePage() {
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/";

  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${location.origin}/api/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || `인증 실패 (HTTP ${res.status})`);
        return;
      }
      // 하드 내비게이션: 쿠키 동반 보장
      window.location.replace(redirect || "/");
    } catch {
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-overlay/70" />
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5 rounded-panel border border-border bg-card p-6 shadow-soft">
          <h1 className="text-ui-section-title font-ui-medium">🔒 아직 개발 단계입니다</h1>
          <p className="text-ui-body-sm text-muted-foreground">
            접근하려면 개발자 전용 비밀번호를 입력하세요.
          </p>

          <div className="space-y-2">
            <Label htmlFor="developer-password">비밀번호</Label>
            <Input
              id="developer-password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="개발자 전용 비밀번호"
              autoFocus
            />
          </div>

          {msg && <p className="text-ui-label text-destructive">{msg}</p>}

          <Button
            type="button"
            variant="highlight"
            disabled={loading || !pw}
            onClick={handleClick}
            className="min-h-11 w-full"
          >
            {loading ? "확인 중…" : "입장하기"}
          </Button>

          <p className="text-ui-label text-muted-foreground text-center">
            인증에 성공하면 {redirect} 로 이동합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
