'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { MdSportsTennis } from 'react-icons/md';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

// 제출 직전 최종 유효성 가드
const ALLOWED_LEVEL = new Set(['beginner', 'intermediate', 'advanced', 'pro']);
const ALLOWED_HAND = new Set(['right', 'left', 'both']);
const ALLOWED_PLAY_STYLE = new Set(['baseline', 'all_court', 'serve_and_volley', 'counter_puncher', 'other']);

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const isTooLong = (s: string, max: number) => s.length > max;

// "300", "300g" 같이 입력해도 숫자만 뽑아서 파싱 (비어있으면 null)
const parseOptionalNumber = (raw: string) => {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

type TennisProfile = {
  level: string;
  hand: string;
  playStyle: string;
  mainRacket: {
    brand: string;
    model: string;
    weight: string;
    balance: string;
  };
  mainString: {
    brand: string;
    model: string;
    gauge: string;
    material: string;
    tensionMain: string;
    tensionCross: string;
  };
  note: string;
  isPublic: boolean;
};

const defaultProfile: TennisProfile = {
  level: '',
  hand: '',
  playStyle: '',
  mainRacket: {
    brand: '',
    model: '',
    weight: '',
    balance: '',
  },
  mainString: {
    brand: '',
    model: '',
    gauge: '',
    material: '',
    tensionMain: '',
    tensionCross: '',
  },
  note: '',
  isPublic: true,
};

export default function TennisProfileForm() {
  const [profile, setProfile] = useState<TennisProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩
  const [isSaving, setIsSaving] = useState(false); // 저장 중 상태

  // 최초 로딩 완료 시점의 "기준 스냅샷" 저장 → 변경 여부 판단
  const baselineRef = useRef<string | null>(null);
  const snapshot = useMemo(() => JSON.stringify(profile), [profile]);

  useEffect(() => {
    if (!isLoading && baselineRef.current === null) {
      baselineRef.current = snapshot;
    }
  }, [isLoading, snapshot]);

  const isDirty = !isLoading && baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !isSaving);

  // 1) 마운트 시 내 테니스 프로필 불러오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/me/tennis-profile', {
          credentials: 'include',
        });

        if (!res.ok) {
          // 401 등은 그냥 빈 기본값으로 두고 메시지 정도만
          console.error('failed to load tennis profile', res.status);
          return;
        }

        const data = await res.json();

        if (data?.profile) {
          const p = data.profile;
          setProfile({
            level: p.level ?? '',
            hand: p.hand ?? '',
            playStyle: p.playStyle ?? '',
            mainRacket: {
              brand: p.mainRacket?.brand ?? '',
              model: p.mainRacket?.model ?? '',
              weight: p.mainRacket?.weight ?? '',
              balance: p.mainRacket?.balance ?? '',
            },
            mainString: {
              brand: p.mainString?.brand ?? '',
              model: p.mainString?.model ?? '',
              gauge: p.mainString?.gauge ?? '',
              material: p.mainString?.material ?? '',
              tensionMain: p.mainString?.tensionMain ?? '',
              tensionCross: p.mainString?.tensionCross ?? '',
            },
            note: p.note ?? '',
            isPublic: Boolean(p.isPublic),
          });
        }
      } catch (err) {
        console.error(err);
        showErrorToast('테니스 프로필을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 공통 onChange 헬퍼 (루트 필드용)
  const updateField = <K extends keyof TennisProfile>(key: K, value: TennisProfile[K]) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 라켓/스트링 중첩 필드용
  const updateMainRacket = (key: keyof TennisProfile['mainRacket'], value: string) => {
    setProfile((prev) => ({
      ...prev,
      mainRacket: {
        ...prev.mainRacket,
        [key]: value,
      },
    }));
  };

  const updateMainString = (key: keyof TennisProfile['mainString'], value: string) => {
    setProfile((prev) => ({
      ...prev,
      mainString: {
        ...prev.mainString,
        [key]: value,
      },
    }));
  };

  // 2) 저장 버튼 클릭 시
  const handleSave = async () => {
    // 저장 전 최종 검증 + 정규화
    const level = trim(profile.level);
    const hand = trim(profile.hand);
    const playStyle = trim(profile.playStyle);

    // Select 값은 허용값만 저장 (조작 방지)
    if (level && !ALLOWED_LEVEL.has(level)) {
      showErrorToast('실력 레벨 값이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }
    if (hand && !ALLOWED_HAND.has(hand)) {
      showErrorToast('사용 손 값이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }
    if (playStyle && !ALLOWED_PLAY_STYLE.has(playStyle)) {
      showErrorToast('플레이 스타일 값이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }

    // 문자열 길이 제한(데이터 품질 보호)
    const racketBrand = trim(profile.mainRacket.brand);
    const racketModel = trim(profile.mainRacket.model);
    const racketBalance = trim(profile.mainRacket.balance);

    const stringBrand = trim(profile.mainString.brand);
    const stringModel = trim(profile.mainString.model);
    const stringGauge = trim(profile.mainString.gauge);
    const stringMaterial = trim(profile.mainString.material);

    const note = trim(profile.note);

    if (isTooLong(racketBrand, 40) || isTooLong(racketModel, 60) || isTooLong(racketBalance, 40)) {
      showErrorToast('라켓 정보가 너무 깁니다. (브랜드 40자 / 모델 60자 / 밸런스 40자 이내)');
      return;
    }
    if (isTooLong(stringBrand, 40) || isTooLong(stringModel, 60) || isTooLong(stringGauge, 20) || isTooLong(stringMaterial, 30)) {
      showErrorToast('스트링 정보가 너무 깁니다. (브랜드 40자 / 모델 60자 / 게이지 20자 / 재질 30자 이내)');
      return;
    }
    if (isTooLong(note, 200)) {
      showErrorToast('소개 문구는 200자 이내로 입력해주세요.');
      return;
    }

    // 숫자 필드(무게/텐션): 숫자인지 + 범위 체크 (비어있으면 통과)
    const weightRaw = trim(profile.mainRacket.weight);
    const tMainRaw = trim(profile.mainString.tensionMain);
    const tCrossRaw = trim(profile.mainString.tensionCross);

    const weight = weightRaw ? parseOptionalNumber(weightRaw) : null;
    if (weightRaw && weight === null) {
      showErrorToast('라켓 무게는 숫자로 입력해주세요. (예: 300)');
      return;
    }
    if (weight !== null && (weight < 200 || weight > 450)) {
      showErrorToast('라켓 무게 범위가 비정상적입니다. (200~450g 권장)');
      return;
    }

    const tMain = tMainRaw ? parseOptionalNumber(tMainRaw) : null;
    if (tMainRaw && tMain === null) {
      showErrorToast('메인 텐션은 숫자로 입력해주세요. (예: 23)');
      return;
    }
    if (tMain !== null && (tMain < 10 || tMain > 35)) {
      showErrorToast('메인 텐션 범위가 비정상적입니다. (10~35kg 권장)');
      return;
    }

    const tCross = tCrossRaw ? parseOptionalNumber(tCrossRaw) : null;
    if (tCrossRaw && tCross === null) {
      showErrorToast('크로스 텐션은 숫자로 입력해주세요. (예: 22)');
      return;
    }
    if (tCross !== null && (tCross < 10 || tCross > 35)) {
      showErrorToast('크로스 텐션 범위가 비정상적입니다. (10~35kg 권장)');
      return;
    }

    // 검증 통과 후 서버로 보낼 payload를 "정규화"해서 구성
    // - trim 적용
    // - 숫자 필드는 숫자만 남긴 문자열로 저장 (예: "23", "300")
    const payload: TennisProfile = {
      ...profile,
      level,
      hand,
      playStyle,
      mainRacket: {
        ...profile.mainRacket,
        brand: racketBrand,
        model: racketModel,
        weight: weight === null ? '' : String(weight),
        balance: racketBalance,
      },
      mainString: {
        ...profile.mainString,
        brand: stringBrand,
        model: stringModel,
        gauge: stringGauge,
        material: stringMaterial,
        tensionMain: tMain === null ? '' : String(tMain),
        tensionCross: tCross === null ? '' : String(tCross),
      },
      note,
      isPublic: Boolean(profile.isPublic),
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/users/me/tennis-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showErrorToast('테니스 프로필 저장에 실패했습니다.');
        return;
      }

      showSuccessToast('테니스 프로필이 저장되었습니다.');
      // 저장 성공하면 현재 상태를 기준선으로 갱신 → "수정됨" 상태 해제
      baselineRef.current = JSON.stringify(profile);
    } catch (err) {
      console.error(err);
      showErrorToast('테니스 프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
      <CardHeader className="bg-muted border-b">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground rounded-2xl p-3 shadow-lg">
            <MdSportsTennis className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">테니스 프로필</CardTitle>
            <CardDescription>사용하는 라켓과 스트링, 플레이 스타일을 설정하면 커뮤니티에서 프로필 카드로 보여집니다.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">테니스 프로필을 불러오는 중입니다...</p>
        ) : (
          <>
            {/* 플레이어 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">플레이어 기본 정보</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {/* 레벨 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">실력 레벨</Label>
                  <Select value={profile.level} onValueChange={(value) => updateField('level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="레벨을 선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">초보자</SelectItem>
                      <SelectItem value="intermediate">중급자</SelectItem>
                      <SelectItem value="advanced">상급자</SelectItem>
                      <SelectItem value="pro">준프로 / 프로</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 손 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">사용 손</Label>
                  <Select value={profile.hand} onValueChange={(value) => updateField('hand', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="오른손 / 왼손" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">오른손</SelectItem>
                      <SelectItem value="left">왼손</SelectItem>
                      <SelectItem value="both">양손</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 플레이 스타일 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">플레이 스타일</Label>
                  <Select value={profile.playStyle} onValueChange={(value) => updateField('playStyle', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="플레이 스타일 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baseline">베이스라이너</SelectItem>
                      <SelectItem value="all_court">올코트</SelectItem>
                      <SelectItem value="serve_and_volley">서브&발리</SelectItem>
                      <SelectItem value="counter_puncher">카운터 펀처</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. 메인 라켓 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">메인 라켓</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">브랜드</Label>
                  <Input value={profile.mainRacket.brand} onChange={(e) => updateMainRacket('brand', e.target.value)} placeholder="예: 바볼랏, 윌슨" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">모델명</Label>
                  <Input value={profile.mainRacket.model} onChange={(e) => updateMainRacket('model', e.target.value)} placeholder="예: Pure Drive 2021" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">무게 (g)</Label>
                  <Input value={profile.mainRacket.weight} onChange={(e) => updateMainRacket('weight', e.target.value)} placeholder="예: 300" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">밸런스</Label>
                  <Input value={profile.mainRacket.balance} onChange={(e) => updateMainRacket('balance', e.target.value)} placeholder="예: 320mm, 3pts HL" />
                </div>
              </div>
            </div>

            {/* 3. 메인 스트링 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">메인 스트링</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">브랜드</Label>
                  <Input value={profile.mainString.brand} onChange={(e) => updateMainString('brand', e.target.value)} placeholder="예: Luxilon" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">모델명</Label>
                  <Input value={profile.mainString.model} onChange={(e) => updateMainString('model', e.target.value)} placeholder="예: Alu Power" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">게이지</Label>
                  <Input value={profile.mainString.gauge} onChange={(e) => updateMainString('gauge', e.target.value)} placeholder="예: 1.25, 16L" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">재질</Label>
                  <Input value={profile.mainString.material} onChange={(e) => updateMainString('material', e.target.value)} placeholder="예: 폴리, 멀티, 내추럴" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">메인 텐션 (kg)</Label>
                  <Input value={profile.mainString.tensionMain} onChange={(e) => updateMainString('tensionMain', e.target.value)} placeholder="예: 23" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">크로스 텐션 (kg)</Label>
                  <Input value={profile.mainString.tensionCross} onChange={(e) => updateMainString('tensionCross', e.target.value)} placeholder="예: 22" />
                </div>
              </div>
            </div>

            {/* 4. 소개 문구 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">소개 / 한 줄 설명</Label>
              <Textarea value={profile.note} onChange={(e) => updateField('note', e.target.value)} rows={3} placeholder="예: 중급, 탑스핀 위주로 치고 더블스를 좋아합니다." />
            </div>

            {/* 5. 공개 여부 */}
            <div className="flex items-center justify-between rounded-xl bg-muted dark:bg-card/40 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">커뮤니티에서 테니스 프로필 공개</p>
                <p className="text-xs text-muted-foreground">작성자 프로필 카드에서 라켓/스트링 정보를 보여줄지 여부를 설정합니다.</p>
              </div>
              <Switch checked={profile.isPublic} onCheckedChange={(checked) => updateField('isPublic', checked)} />
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="px-6">
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
