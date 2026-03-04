'use client';

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
import { cn } from '@/lib/utils';
import { RefObject } from 'react';

type Props = {
  category: 'racket' | 'string' | 'equipment';
  value: MarketMeta;
  onChange: (next: MarketMeta) => void;
  disabled?: boolean;
  fieldErrors?: {
    price?: string;
    modelName?: string;
  };
  priceRef?: RefObject<HTMLInputElement | null>;
  modelNameRef?: RefObject<HTMLInputElement | null>;
};

const onNum = (v: string) => {
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

export default function MarketMetaFields({ category, value, onChange, disabled, fieldErrors, priceRef, modelNameRef }: Props) {
  const hasValidPrice = typeof value.price === 'number' && value.price > 0;
  const priceDisplay = typeof value.price === 'number' && value.price > 0 ? `${value.price.toLocaleString('ko-KR')}원` : null;

  return (
    <div className="space-y-6">
      {/* ── 섹션 1: 거래 핵심 정보 ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 md:px-6">
          <h3 className="text-sm font-semibold text-foreground">거래 핵심 정보</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">구매자가 가장 먼저 확인하는 판매 조건입니다.</p>
        </div>

        <div className="px-5 py-5 md:px-6 space-y-5">
          {/* 판매가 - 가장 강조 */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              판매가 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                ref={priceRef}
                type="number"
                min={1}
                placeholder="금액을 입력하세요"
                value={value.price ?? ''}
                onChange={(e) => onChange({ ...value, price: onNum(e.target.value) })}
                disabled={disabled}
                className={cn('h-12 pr-10 text-lg font-semibold placeholder:text-muted-foreground/60', fieldErrors?.price ? 'border-destructive focus-visible:border-destructive' : '')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">원</span>
            </div>
            {fieldErrors?.price ? <p className="text-xs text-destructive">{fieldErrors.price}</p> : null}
            <p className={`text-xs ${hasValidPrice ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {priceDisplay ? (
                <>
                  입력 가격: <span className="font-semibold text-foreground">{priceDisplay}</span>
                </>
              ) : (
                '숫자만 입력하세요. 목록과 상세에서 원 단위로 표시됩니다.'
              )}
            </p>
          </div>

          {/* 판매 상태 / 상태 등급 - 2열 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">
                판매 상태 <span className="text-destructive">*</span>
              </Label>
              <select className={selectCls} value={value.saleStatus} onChange={(e) => onChange({ ...value, saleStatus: e.target.value as any })} disabled={disabled}>
                {MARKET_SALE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">
                상태 등급 <span className="text-destructive">*</span>
              </Label>
              <select className={selectCls} value={value.conditionGrade} onChange={(e) => onChange({ ...value, conditionGrade: e.target.value as any })} disabled={disabled}>
                {MARKET_CONDITION_GRADE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 상태 메모 - 독립 블록 */}
          <div className="space-y-2">
            <Label className="text-sm">상태 설명</Label>
            <Textarea
              value={value.conditionNote ?? ''}
              onChange={(e) => onChange({ ...value, conditionNote: e.target.value })}
              disabled={disabled}
              className="min-h-[100px] resize-y placeholder:text-muted-foreground/60"
              placeholder="ex: 프레임 상단에 생활 스크래치가 있고, 그립은 최근 교체했습니다."
            />
            <p className="text-[11px] text-muted-foreground">실물 상태를 솔직하게 적을수록 거래 신뢰도가 올라갑니다.</p>
          </div>
        </div>
      </div>

      {/* ── 섹션 2: 라켓 상세 스펙 ── */}
      {category === 'racket' && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h3 className="text-sm font-semibold text-foreground">라켓 상세 정보</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">모델명은 필수이며, 나머지 스펙은 아는 범위에서만 입력하면 됩니다.</p>
          </div>

          <div className="px-5 py-5 md:px-6 space-y-6">
            {/* 핵심 스펙 */}
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">핵심 스펙</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm">
                    모델명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    ref={modelNameRef}
                    placeholder="ex: EZONE 98 2024, PRO STAFF 97 V14"
                    value={value.racketSpec?.modelName ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        racketSpec: { ...(value.racketSpec ?? { modelName: '' }), modelName: e.target.value },
                        stringSpec: null,
                      })
                    }
                    disabled={disabled}
                    className={cn('placeholder:text-muted-foreground/60', fieldErrors?.modelName ? 'border-destructive focus-visible:border-destructive' : '')}
                  />
                  {fieldErrors?.modelName ? <p className="text-xs text-destructive">{fieldErrors.modelName}</p> : null}
                </div>
                {(
                  [
                    { key: 'weight' as const, ph: 'ex: 300' },
                    { key: 'balance' as const, ph: 'ex: 320' },
                    { key: 'headSize' as const, ph: 'ex: 98' },
                  ] as const
                ).map(({ key, ph }) => (
                  <div className="space-y-2" key={key}>
                    <Label className="text-sm">{getMarketRacketFieldLabel(key)}</Label>
                    <Input
                      type="number"
                      placeholder={ph}
                      value={(value.racketSpec as any)?.[key] ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          racketSpec: { ...(value.racketSpec ?? { modelName: '' }), [key]: onNum(e.target.value) },
                          stringSpec: null,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-border" />

            {/* 선택 스펙 */}
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">선택 스펙</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    { key: 'lengthIn' as const, ph: 'ex: 27' },
                    { key: 'swingWeight' as const, ph: 'ex: 320' },
                    { key: 'stiffnessRa' as const, ph: 'ex: 68' },
                  ] as const
                ).map(({ key, ph }) => (
                  <div className="space-y-2" key={key}>
                    <Label className="text-sm">{getMarketRacketFieldLabel(key)}</Label>
                    <Input
                      type="number"
                      placeholder={ph}
                      value={(value.racketSpec as any)?.[key] ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          racketSpec: { ...(value.racketSpec ?? { modelName: '' }), [key]: onNum(e.target.value) },
                          stringSpec: null,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-sm">스트링 패턴</Label>
                  <select
                    className={selectCls}
                    value={value.racketSpec?.pattern ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        racketSpec: { ...(value.racketSpec ?? { modelName: '' }), pattern: e.target.value || null },
                        stringSpec: null,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="">선택 안함</option>
                    {MARKET_RACKET_PATTERN_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">그립 사이즈</Label>
                  <select
                    className={selectCls}
                    value={value.racketSpec?.gripSize ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        racketSpec: { ...(value.racketSpec ?? { modelName: '' }), gripSize: e.target.value || null },
                        stringSpec: null,
                      })
                    }
                    disabled={disabled}
                  >
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
          </div>
        </div>
      )}

      {/* ── 섹션 2: 스트링 상세 스펙 ── */}
      {category === 'string' && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h3 className="text-sm font-semibold text-foreground">스트링 상세 정보</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">모델명은 필수이며, 세부 옵션은 아는 범위에서만 작성해도 됩니다.</p>
          </div>

          <div className="px-5 py-5 md:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm">
                  모델명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  ref={modelNameRef}
                  placeholder="예: ALU POWER 125, POLYTOUR PRO 1.25"
                  value={value.stringSpec?.modelName ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stringSpec: { ...(value.stringSpec ?? { modelName: '' }), modelName: e.target.value },
                      racketSpec: null,
                    })
                  }
                  disabled={disabled}
                  className={cn('placeholder:text-muted-foreground/60', fieldErrors?.modelName ? 'border-destructive focus-visible:border-destructive' : '')}
                />
                {fieldErrors?.modelName ? <p className="text-xs text-destructive">{fieldErrors.modelName}</p> : null}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">재질</Label>
                <select
                  className={selectCls}
                  value={value.stringSpec?.material ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stringSpec: { ...(value.stringSpec ?? { modelName: '' }), material: e.target.value || null },
                      racketSpec: null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="">선택 안함</option>
                  {MARKET_STRING_MATERIAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {getMarketStringMaterialLabel(o)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">게이지</Label>
                <select
                  className={selectCls}
                  value={value.stringSpec?.gauge ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stringSpec: { ...(value.stringSpec ?? { modelName: '' }), gauge: e.target.value || null },
                      racketSpec: null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="">선택 안함</option>
                  {MARKET_STRING_GAUGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">색상</Label>
                <select
                  className={selectCls}
                  value={value.stringSpec?.color ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stringSpec: { ...(value.stringSpec ?? { modelName: '' }), color: e.target.value || null },
                      racketSpec: null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="">선택 안함</option>
                  {MARKET_STRING_COLOR_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {getMarketStringColorLabel(o)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">길이</Label>
                <select
                  className={selectCls}
                  value={value.stringSpec?.length ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stringSpec: { ...(value.stringSpec ?? { modelName: '' }), length: e.target.value || null },
                      racketSpec: null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="">선택 안함</option>
                  {MARKET_STRING_LENGTH_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {getMarketStringLengthLabel(o)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
