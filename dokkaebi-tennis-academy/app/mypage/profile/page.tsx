'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { showErrorToast, showSuccessToast, showToast } from '@/lib/toast';
import WithdrawalReasonSelect from '@/app/mypage/profile/_components/WithdrawalReasonSelect';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // zustand 스토어에서 꺼낸 토큰을 Authorization 헤더에 실어 보냄
        const token = useAuthStore.getState().accessToken;
        const res = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('정보를 불러올 수 없습니다');

        const user = await res.json();

        const {
          address, // 기본 주소
          postalCode, // 우편번호
          addressDetail, // 상세 주소
          ...rest // 그 외의 name, email, phone 등
        } = user;

        setProfileData({
          ...profileData,
          ...rest,
          address: {
            address1: address ?? '',
            postalCode: postalCode ?? '',
            address2: addressDetail ?? '',
          },
        });
      } catch (err) {
        console.error(err);
        showErrorToast('회원 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchProfile();
  }, []);

  // 우편 번호 검색
  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const fullAddress = data.address;
        const postalCode = data.zonecode;

        setProfileData((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            address1: fullAddress,
            postalCode: postalCode,
          },
        }));
      },
    }).open();
  };

  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    address: {
      postalCode: '',
      address1: '',
      address2: '',
    },
    marketing: {
      email: false,
      sms: false,
      push: false,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const basicAddress = profileData.address.address1.trim();
      const detailedAddress = profileData.address.address2.trim();
      const postalCode = profileData.address.postalCode;
      // zustand에서 방금 로그인해 저장한 토큰 꺼내오기
      const token = useAuthStore.getState().accessToken;

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          postalCode,
          address: basicAddress, // 상세주소는 저장하지 않음
          addressDetail: detailedAddress, //  별도로 저장하고 싶을 경우 이 필드로
          marketing: profileData.marketing,
        }),
      });

      if (!res.ok) throw new Error('저장 실패');

      showSuccessToast('회원 정보가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      showErrorToast('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };
  // 비밀번호 변경 핸들러 함수
  const handlePasswordChange = async () => {
    // 새 비밀번호와 확인용 비밀번호가 일치하지 않을 경우 얼럿 표시
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true); // 로딩 상태 활성화

    try {
      // API 호출: 실제 비밀번호 변경 요청
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword, // 현재 비밀번호
          newPassword: passwordData.newPassword, // 새 비밀번호
        }),
      });

      // 응답이 실패일 경우 예외 처리
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '비밀번호 변경 실패');
      }

      // 성공 시 입력 필드 초기화
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccessToast('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error: any) {
      // 실패 시 에러 메시지 표시
      showErrorToast(error.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false); // 로딩 상태 종료
    }
  };

  // console.log('🔍 저장 직전 상태:', profileData);

  // 회원 탈퇴 상태 관리
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/mypage" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          마이페이지로 돌아가기
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">회원정보 수정</h1>
        <p className="text-muted-foreground">개인정보를 안전하게 관리하세요.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">기본정보</TabsTrigger>
          <TabsTrigger value="password">비밀번호</TabsTrigger>
          <TabsTrigger value="address">배송지</TabsTrigger>
          <TabsTrigger value="preferences">설정</TabsTrigger>
        </TabsList>

        {/* 기본정보 탭 */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>기본정보</CardTitle>
              <CardDescription>개인정보를 수정할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 프로필 이미지 */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" alt="프로필 이미지" />
                  <AvatarFallback>이미지</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={() => showToast('해당 기능은 준비 중입니다.')}>
                  <Camera className="mr-2 h-4 w-4" />
                  이미지 변경
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input id="name" value={profileData.name ?? '이름 없음'} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input id="email" type="email" value={profileData.email ?? '이메일 없음'} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input id="phone" value={profileData.phone ?? '전화번호 없음'} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="birthDate">생년월일</Label>
                  <Input id="birthDate" type="date" value={profileData.birthDate} onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })} />
                </div> */}
                {/* <div className="space-y-2">
                  <Label htmlFor="gender">성별</Label>
                  <Select value={profileData.gender} onValueChange={(value) => setProfileData({ ...profileData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">남성</SelectItem>
                      <SelectItem value="female">여성</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 비밀번호 탭 */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>보안을 위해 정기적으로 비밀번호를 변경해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호 *</Label>
                <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호 *</Label>
                <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                <p className="text-sm text-muted-foreground">8자 이상, 영문/숫자 조합으로 입력해주세요. (특수문자는 선택)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인 *</Label>
                <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePasswordChange} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 배송지 탭 */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>배송지 관리</CardTitle>
              <CardDescription>기본 배송지 정보를 관리할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">우편번호</Label>
                  <div className="flex gap-2">
                    <Input
                      id="postalCode"
                      value={profileData.address.postalCode}
                      readOnly
                      className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-default"
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          address: {
                            ...prev.address,
                            postalCode: e.target.value,
                          },
                        }))
                      }
                    />
                    <Button variant="outline" size="sm" onClick={handleAddressSearch}>
                      검색
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address1">주소</Label>
                <Input
                  id="address1"
                  value={profileData.address.address1}
                  readOnly
                  className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-default"
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        address1: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">상세주소</Label>
                <Input
                  id="address2"
                  value={profileData.address.address2}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: { ...profileData.address, address2: e.target.value },
                    })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>마케팅 수신 동의</CardTitle>
                <CardDescription>마케팅 정보 수신 방법을 선택할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-marketing">이메일 수신</Label>
                    <p className="text-sm text-muted-foreground">할인 쿠폰, 신상품 소식을 이메일로 받아보세요.</p>
                  </div>
                  <Switch
                    id="email-marketing"
                    checked={profileData.marketing?.email ?? false}
                    onCheckedChange={(checked) =>
                      setProfileData({
                        ...profileData,
                        marketing: { ...profileData.marketing, email: checked },
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-marketing">SMS 수신</Label>
                    <p className="text-sm text-muted-foreground">주문 상태, 배송 정보를 SMS로 받아보세요.</p>
                  </div>
                  <Switch
                    id="sms-marketing"
                    checked={profileData.marketing?.sms ?? false}
                    onCheckedChange={(checked) =>
                      setProfileData({
                        ...profileData,
                        marketing: { ...profileData.marketing, sms: checked },
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-marketing">앱 푸시 알림</Label>
                    <p className="text-sm text-muted-foreground">앱을 통해 실시간 알림을 받아보세요.</p>
                  </div>
                  <Switch
                    id="push-marketing"
                    checked={profileData.marketing?.push ?? false}
                    onCheckedChange={(checked) =>
                      setProfileData({
                        ...profileData,
                        marketing: { ...profileData.marketing, push: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">회원 탈퇴</CardTitle>
                <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</CardDescription>
              </CardHeader>

              <CardContent>
                {showWithdrawalForm ? (
                  <WithdrawalReasonSelect
                    onSubmit={async (reason, detail) => {
                      try {
                        // 1) DELETE로 탈퇴 요청
                        const res = await fetch('/api/users/me/leave', {
                          method: 'DELETE',
                          headers: {
                            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
                          },
                        });
                        if (!res.ok) {
                          let errBody;
                          try {
                            errBody = await res.json();
                          } catch {
                            errBody = { error: '알 수 없는 오류' };
                          }
                          throw new Error(errBody.error || '탈퇴 실패');
                        }

                        // 2) 복구 토큰 꺼내기
                        const { recoveryToken } = await res.json();

                        // 3) 로그아웃 처리
                        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                        useAuthStore.getState().logout();

                        // 4) 복구 페이지로 이동 (토큰 전달)
                        router.push(`/withdrawal?token=${encodeURIComponent(recoveryToken)}`);
                      } catch (error: any) {
                        showErrorToast(error.message || '회원 탈퇴 중 오류가 발생했습니다.');
                      }
                    }}
                  />
                ) : (
                  <Button variant="destructive" type="button" onClick={() => setShowWithdrawalForm(true)}>
                    회원 탈퇴
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
