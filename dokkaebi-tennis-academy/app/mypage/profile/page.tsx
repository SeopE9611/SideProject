'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-1234-5678',
    birthDate: '1990-01-01',
    gender: 'male',
    address: {
      zipCode: '12345',
      address1: '서울시 강남구 테헤란로 123',
      address2: '456호',
    },
    marketing: {
      email: true,
      sms: false,
      push: true,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    // API 호출 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    alert('프로필이 업데이트되었습니다.');
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsLoading(true);
    // API 호출 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('비밀번호가 변경되었습니다.');
  };

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
                  <AvatarFallback>홍길동</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="mr-2 h-4 w-4" />
                  이미지 변경
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input id="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input id="email" type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">생년월일</Label>
                  <Input id="birthDate" type="date" value={profileData.birthDate} onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })} />
                </div>
                <div className="space-y-2">
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
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={isLoading}>
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
                <p className="text-sm text-muted-foreground">8자 이상, 영문/숫자/특수문자 조합으로 입력해주세요.</p>
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
                      id="zipCode"
                      value={profileData.address.zipCode}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          address: { ...profileData.address, zipCode: e.target.value },
                        })
                      }
                    />
                    <Button variant="outline" size="sm">
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
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: { ...profileData.address, address1: e.target.value },
                    })
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
                <Button onClick={handleProfileUpdate} disabled={isLoading}>
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
                    checked={profileData.marketing.email}
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
                    checked={profileData.marketing.sms}
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
                    checked={profileData.marketing.push}
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
                <Button variant="destructive" onClick={() => alert('회원 탈퇴 기능은 준비 중입니다.')}>
                  회원 탈퇴
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
