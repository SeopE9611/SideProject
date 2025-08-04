'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Save, User, Mail, Phone, MapPin, Shield, Bell, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import WithdrawalReasonSelect from '@/app/mypage/profile/_components/WithdrawalReasonSelect';
import { useRouter } from 'next/navigation';

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function ProfileClient({ user }: Props) {
  const router = useRouter();

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

  const [isLoading, setIsLoading] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('정보를 불러올 수 없습니다');

        const user = await res.json();

        const { address, postalCode, addressDetail, ...rest } = user;

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
      oncomplete: (data: any) => {
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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const basicAddress = profileData.address.address1.trim();
      const detailedAddress = profileData.address.address2.trim();
      const postalCode = profileData.address.postalCode;

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          postalCode,
          address: basicAddress,
          addressDetail: detailedAddress,
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

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '비밀번호 변경 실패');
      }

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccessToast('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error: any) {
      showErrorToast(error.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
          <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-bounce" />
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-6 mb-8">
              <Link href="/mypage" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-5 w-5" />
                마이페이지로 돌아가기
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                <Settings className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">회원정보 수정</h1>
                <p className="text-xl text-blue-100">개인정보를 안전하게 관리하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-8">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger value="profile" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    <User className="h-5 w-5" />
                    <span className="text-xs font-medium">기본정보</span>
                  </TabsTrigger>
                  <TabsTrigger value="password" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    <Shield className="h-5 w-5" />
                    <span className="text-xs font-medium">비밀번호</span>
                  </TabsTrigger>
                  <TabsTrigger value="address" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    <MapPin className="h-5 w-5" />
                    <span className="text-xs font-medium">배송지</span>
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    <Bell className="h-5 w-5" />
                    <span className="text-xs font-medium">설정</span>
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            {/* 기본정보 탭 */}
            <TabsContent value="profile">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full p-3">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">기본정보</CardTitle>
                      <CardDescription>개인정보를 수정할 수 있습니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* 프로필 이미지 */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage src="/placeholder.svg?height=96&width=96" alt="프로필 이미지" />
                      <AvatarFallback className="text-2xl bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">{profileData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => showInfoToast('해당 기능은 준비 중입니다.')} className="mb-2">
                        <Camera className="mr-2 h-4 w-4" />
                        이미지 변경
                      </Button>
                      <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG 파일만 업로드 가능합니다</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        이름 *
                      </Label>
                      <Input id="name" value={profileData.name ?? '이름 없음'} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        이메일 *
                      </Label>
                      <Input id="email" type="email" value={profileData.email ?? '이메일 없음'} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="h-12" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        전화번호
                      </Label>
                      <Input id="phone" value={profileData.phone ?? '전화번호 없음'} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className="h-12" placeholder="01012345678" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 비밀번호 탭 */}
            <TabsContent value="password">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full p-3">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">비밀번호 변경</CardTitle>
                      <CardDescription>보안을 위해 정기적으로 비밀번호를 변경해주세요.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">현재 비밀번호 *</Label>
                    <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">새 비밀번호 *</Label>
                    <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="h-12" />
                    <p className="text-sm text-muted-foreground">8자 이상, 영문/숫자 조합으로 입력해주세요. (특수문자는 선택)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">새 비밀번호 확인 *</Label>
                    <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="h-12" />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handlePasswordChange} disabled={isLoading} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? '변경 중...' : '비밀번호 변경'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 배송지 탭 */}
            <TabsContent value="address">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-full p-3">
                      <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">배송지 관리</CardTitle>
                      <CardDescription>기본 배송지 정보를 관리할 수 있습니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">우편번호</Label>
                      <div className="flex gap-2">
                        <Input id="postalCode" value={profileData.address.postalCode} readOnly className="h-12 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-default" placeholder="12345" />
                        <Button type="button" onClick={handleAddressSearch} className="h-12 px-6 bg-transparent" variant="outline">
                          검색
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address1">주소</Label>
                    <Input id="address1" value={profileData.address.address1} readOnly className="h-12 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-default" placeholder="주소 검색 버튼을 클릭해주세요" />
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
                      className="h-12"
                      placeholder="동, 호수 등 상세주소"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 설정 탭 */}
            <TabsContent value="preferences">
              <div className="space-y-8">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-full p-3">
                        <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">마케팅 수신 동의</CardTitle>
                        <CardDescription>마케팅 정보 수신 방법을 선택할 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label htmlFor="email-marketing" className="font-medium">
                          이메일 수신
                        </Label>
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
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label htmlFor="sms-marketing" className="font-medium">
                          SMS 수신
                        </Label>
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
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label htmlFor="push-marketing" className="font-medium">
                          앱 푸시 알림
                        </Label>
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

                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? '저장 중...' : '저장'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-red-200 dark:border-red-800">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-b border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 rounded-full p-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-red-700 dark:text-red-400">회원 탈퇴</CardTitle>
                        <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {showWithdrawalForm ? (
                      <WithdrawalReasonSelect
                        onSubmit={async (reason, detail) => {
                          try {
                            const res = await fetch('/api/users/me/leave', {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                reason,
                                detail,
                              }),
                            });

                            if (!res.ok) {
                              const errBody = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
                              throw new Error(errBody.error);
                            }

                            // 탈퇴 성공 흐름
                          } catch (error: any) {
                            showErrorToast(error.message || '회원 탈퇴 중 오류가 발생했습니다.');
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">정말로 탈퇴하시겠습니까?</h3>
                          <p className="text-sm text-red-600 dark:text-red-400">탈퇴 시 모든 개인정보와 이용기록이 삭제되며, 복구할 수 없습니다.</p>
                        </div>
                        <Button variant="destructive" type="button" onClick={() => setShowWithdrawalForm(true)} className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          회원 탈퇴
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
