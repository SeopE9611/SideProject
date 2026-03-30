"use client";

import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const toNumberText = (raw: string) => raw.replace(/[^0-9.]/g, "").slice(0, 4);

type CheckoutStringingServiceAdapter = ReturnType<
  typeof useCheckoutStringingServiceAdapter
>;

type Props = {
  adapter: CheckoutStringingServiceAdapter;
};

export default function CheckoutStringingCompactEditor({ adapter }: Props) {
  const {
    formData,
    setFormData,
    linesForSubmit,
    handleLineFieldChange,
    timeSlots,
    disabledTimes,
    slotsLoading,
  } = adapter;

  const isVisit = formData.collectionMethod === "visit";

  return (
    <Accordion type="single" defaultValue="" className="rounded-lg border border-border bg-background px-3">
      <AccordionItem value="detail" className="border-none">
        <AccordionTrigger value="detail" className="py-3 text-sm">
          상세 설정 열기
        </AccordionTrigger>
        <AccordionContent value="detail" className="space-y-5">
          <section className="space-y-3">
            <p className="text-sm font-medium text-foreground">기본 설정</p>
            {isVisit ? (
              <div className="grid grid-cols-1 bp-sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="checkout-preferred-date" className="text-xs text-muted-foreground">희망 날짜</Label>
                  <Input
                    id="checkout-preferred-date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={formData.preferredDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, preferredDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-preferred-time" className="text-xs text-muted-foreground">희망 시간</Label>
                  <Select
                    value={formData.preferredTime || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, preferredTime: value }))
                    }
                    disabled={!formData.preferredDate || slotsLoading}
                  >
                    <SelectTrigger id="checkout-preferred-time">
                      <SelectValue placeholder={slotsLoading ? "시간 조회 중" : "시간 선택"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(timeSlots || []).map((slot) => (
                        <SelectItem key={slot} value={slot} disabled={(disabledTimes || []).includes(slot)}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">현재 접수 방식은 방문 예약이 필요하지 않습니다.</p>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-foreground">라켓별 세부 설정</p>
            <div className="space-y-3">
              {linesForSubmit.map((line, index) => (
                <div key={line.id} className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">라인 {index + 1} · {line.stringName}</p>
                  <div className="grid grid-cols-1 bp-sm:grid-cols-3 gap-2">
                    <Input
                      value={line.racketType ?? ""}
                      onChange={(e) => handleLineFieldChange(index, "racketType", e.target.value)}
                      placeholder="라켓명"
                    />
                    <Input
                      value={line.tensionMain ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(index, "tensionMain", toNumberText(e.target.value))
                      }
                      placeholder="메인 텐션"
                    />
                    <Input
                      value={line.tensionCross ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(index, "tensionCross", toNumberText(e.target.value))
                      }
                      placeholder="크로스 텐션"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">추가 요청</p>
            <Textarea
              id="checkout-stringing-requirements"
              value={formData.requirements ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, requirements: e.target.value }))
              }
              placeholder="요청사항이 있으면 입력해주세요"
              className="min-h-[92px]"
            />
            <p className="text-xs text-muted-foreground">입력한 요청사항은 주문과 함께 교체 서비스 신청 데이터에 저장됩니다.</p>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
