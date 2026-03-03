'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { MarketMeta } from '@/lib/market';
import {
  MARKET_CONDITION_GRADE_OPTIONS,
  MARKET_RACKET_GRIP_SIZE_OPTIONS,
  MARKET_RACKET_PATTERN_OPTIONS,
  MARKET_SALE_STATUS_OPTIONS,
  MARKET_STRING_COLOR_OPTIONS,
  MARKET_STRING_GAUGE_OPTIONS,
  MARKET_STRING_LENGTH_OPTIONS,
  MARKET_STRING_MATERIAL_OPTIONS,
  getMarketRacketFieldLabel,
  getMarketStringColorLabel,
  getMarketStringLengthLabel,
  getMarketStringMaterialLabel,
} from '@/lib/market';

type Props = {
  category: 'racket' | 'string' | 'equipment';
  value: MarketMeta;
  onChange: (next: MarketMeta) => void;
  disabled?: boolean;
};

const onNum = (v: string) => {
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function MarketMetaFields({ category, value, onChange, disabled }: Props) {
  const priceGuideText = value.price && value.price > 0 ? `입력 가격: ${value.price.toLocaleString('ko-KR')}원` : '가격은 숫자만 입력해 주세요.';

  return (
    <Card className="border border-border bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">상세 스펙 입력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 공통 거래 정보: market 글이라면 항상 받는 핵심 필드 */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>판매가 * <span className="text-xs font-normal text-muted-foreground">희망 판매가를 입력해 주세요.</span></Label>
            <Input type="number" min={1} placeholder="예: 35000" value={value.price ?? ''} onChange={(e) => onChange({ ...value, price: onNum(e.target.value) })} disabled={disabled} />
            <p className="text-[11px] text-muted-foreground">{priceGuideText}</p>
          </div>
          <div className="space-y-2">
            <Label>판매 상태 *</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.saleStatus} onChange={(e) => onChange({ ...value, saleStatus: e.target.value as any })} disabled={disabled}>
              {MARKET_SALE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>상태 등급 *</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.conditionGrade} onChange={(e) => onChange({ ...value, conditionGrade: e.target.value as any })} disabled={disabled}>
              {MARKET_CONDITION_GRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>상태 메모</Label>
          <Textarea value={value.conditionNote ?? ''} onChange={(e) => onChange({ ...value, conditionNote: e.target.value })} disabled={disabled} className="min-h-[80px]" />
          <p className="text-[11px] text-muted-foreground">예: 프레임 상단 미세 스크래치, 그립 교체 필요, 시타 1회</p>
        </div>

        {category === 'racket' && (
          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">라켓 스펙</p>
            <p className="text-[11px] text-muted-foreground">모델명/가격/상태는 핵심 입력 항목이며, 무게·밸런스 등 세부 스펙은 모르면 비워둘 수 있습니다.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>모델명 *</Label>
                <Input placeholder="예: EZONE 98 2024, PRO STAFF 97 V14" value={value.racketSpec?.modelName ?? ''} onChange={(e) => onChange({ ...value, racketSpec: { ...(value.racketSpec ?? { modelName: '' }), modelName: e.target.value }, stringSpec: null })} disabled={disabled} />
              </div>
              {(['weight', 'balance', 'headSize', 'lengthIn', 'swingWeight', 'stiffnessRa'] as const).map((k) => (
                <div className="space-y-2" key={k}>
                  <Label>{getMarketRacketFieldLabel(k)}</Label>
                  <Input type="number" value={(value.racketSpec as any)?.[k] ?? ''} onChange={(e) => onChange({ ...value, racketSpec: { ...(value.racketSpec ?? { modelName: '' }), [k]: onNum(e.target.value) }, stringSpec: null })} disabled={disabled} />
                </div>
              ))}
              <div className="space-y-2">
                <Label>스트링 패턴</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.racketSpec?.pattern ?? ''} onChange={(e) => onChange({ ...value, racketSpec: { ...(value.racketSpec ?? { modelName: '' }), pattern: e.target.value || null }, stringSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_RACKET_PATTERN_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>그립 사이즈</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.racketSpec?.gripSize ?? ''} onChange={(e) => onChange({ ...value, racketSpec: { ...(value.racketSpec ?? { modelName: '' }), gripSize: e.target.value || null }, stringSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_RACKET_GRIP_SIZE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {category === 'string' && (
          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">스트링 스펙</p>
            <p className="text-[11px] text-muted-foreground">모델명/가격/상태를 우선 입력해 주세요. 세부 옵션은 아는 범위에서만 작성해도 됩니다.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>모델명 *</Label>
                <Input placeholder="예: ALU POWER 125, POLYTOUR PRO 1.25" value={value.stringSpec?.modelName ?? ''} onChange={(e) => onChange({ ...value, stringSpec: { ...(value.stringSpec ?? { modelName: '' }), modelName: e.target.value }, racketSpec: null })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>재질</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.stringSpec?.material ?? ''} onChange={(e) => onChange({ ...value, stringSpec: { ...(value.stringSpec ?? { modelName: '' }), material: e.target.value || null }, racketSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_STRING_MATERIAL_OPTIONS.map((o) => <option key={o} value={o}>{getMarketStringMaterialLabel(o)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>게이지</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.stringSpec?.gauge ?? ''} onChange={(e) => onChange({ ...value, stringSpec: { ...(value.stringSpec ?? { modelName: '' }), gauge: e.target.value || null }, racketSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_STRING_GAUGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>색상</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.stringSpec?.color ?? ''} onChange={(e) => onChange({ ...value, stringSpec: { ...(value.stringSpec ?? { modelName: '' }), color: e.target.value || null }, racketSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_STRING_COLOR_OPTIONS.map((o) => <option key={o} value={o}>{getMarketStringColorLabel(o)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>길이</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.stringSpec?.length ?? ''} onChange={(e) => onChange({ ...value, stringSpec: { ...(value.stringSpec ?? { modelName: '' }), length: e.target.value || null }, racketSpec: null })} disabled={disabled}>
                  <option value="">선택 안함</option>
                  {MARKET_STRING_LENGTH_OPTIONS.map((o) => <option key={o} value={o}>{getMarketStringLengthLabel(o)}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">숫자만 입력하면 됩니다. 등록 후 목록/상세에서는 원 단위로 표시됩니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
