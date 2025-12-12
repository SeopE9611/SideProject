'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { MdSportsTennis } from 'react-icons/md';

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
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/me/tennis-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        showErrorToast('테니스 프로필 저장에 실패했습니다.');
        return;
      }

      showSuccessToast('테니스 프로필이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      showErrorToast('테니스 프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
            <MdSportsTennis className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">테니스 프로필</CardTitle>
            <CardDescription>사용하는 라켓과 스트링, 플레이 스타일을 설정하면 커뮤니티에서 프로필 카드로 보여집니다.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">테니스 프로필을 불러오는 중입니다...</p>
        ) : (
          <>
            {/* 플레이어 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">플레이어 기본 정보</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {/* 레벨 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">실력 레벨</Label>
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
                  <Label className="text-xs text-slate-600 dark:text-slate-300">사용 손</Label>
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
                  <Label className="text-xs text-slate-600 dark:text-slate-300">플레이 스타일</Label>
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
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">메인 라켓</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">브랜드</Label>
                  <Input value={profile.mainRacket.brand} onChange={(e) => updateMainRacket('brand', e.target.value)} placeholder="예: 바볼랏, 윌슨" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">모델명</Label>
                  <Input value={profile.mainRacket.model} onChange={(e) => updateMainRacket('model', e.target.value)} placeholder="예: Pure Drive 2021" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">무게 (g)</Label>
                  <Input value={profile.mainRacket.weight} onChange={(e) => updateMainRacket('weight', e.target.value)} placeholder="예: 300" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">밸런스</Label>
                  <Input value={profile.mainRacket.balance} onChange={(e) => updateMainRacket('balance', e.target.value)} placeholder="예: 320mm, 3pts HL" />
                </div>
              </div>
            </div>

            {/* 3. 메인 스트링 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">메인 스트링</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">브랜드</Label>
                  <Input value={profile.mainString.brand} onChange={(e) => updateMainString('brand', e.target.value)} placeholder="예: Luxilon" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">모델명</Label>
                  <Input value={profile.mainString.model} onChange={(e) => updateMainString('model', e.target.value)} placeholder="예: Alu Power" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">게이지</Label>
                  <Input value={profile.mainString.gauge} onChange={(e) => updateMainString('gauge', e.target.value)} placeholder="예: 1.25, 16L" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">재질</Label>
                  <Input value={profile.mainString.material} onChange={(e) => updateMainString('material', e.target.value)} placeholder="예: 폴리, 멀티, 내추럴" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">메인 텐션 (kg)</Label>
                  <Input value={profile.mainString.tensionMain} onChange={(e) => updateMainString('tensionMain', e.target.value)} placeholder="예: 23" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">크로스 텐션 (kg)</Label>
                  <Input value={profile.mainString.tensionCross} onChange={(e) => updateMainString('tensionCross', e.target.value)} placeholder="예: 22" />
                </div>
              </div>
            </div>

            {/* 4. 소개 문구 */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-600 dark:text-slate-300">소개 / 한 줄 설명</Label>
              <Textarea value={profile.note} onChange={(e) => updateField('note', e.target.value)} rows={3} placeholder="예: 중급, 탑스핀 위주로 치고 더블스를 좋아합니다." />
            </div>

            {/* 5. 공개 여부 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">커뮤니티에서 테니스 프로필 공개</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">작성자 프로필 카드에서 라켓/스트링 정보를 보여줄지 여부를 설정합니다.</p>
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
