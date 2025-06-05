'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('login');

  const [email, setEmail] = useState('');
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null); // null: 아직 확인 안함
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  useEffect(() => {
    const tabParam = params.get('tab');
    if (tabParam === 'login' || tabParam === 'register') {
      setActiveTab(tabParam);
    }
  }, [params]);

  const handleLogin = async () => {
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await res.json();

    if (!res.ok) {
      // 유효성 검사 에러 분기 처리
      switch (result.error) {
        case 'not_found':
          showErrorToast('존재하지 않는 이메일입니다.');
          break;
        case 'withdrawn':
          showErrorToast(
            <>
              존재하지 않거나 탈퇴한 계정입니다.
              <button className="text-sm text-blue-600 hover:underline ml-2" onClick={() => router.push(`/withdrawal?email=${encodeURIComponent(email)}`)}>
                탈퇴 철회 페이지로 이동하기(클릭)
              </button>
            </>
          );
          break;
        case 'wrong_password':
          showErrorToast('비밀번호가 일치하지 않습니다.');
          break;
        case 'missing_fields':
          showErrorToast('이메일과 비밀번호를 모두 입력해주세요.');
          break;
        default:
          showErrorToast('로그인에 실패했습니다.');
      }
      return;
    }

    //  에러가 없을 경우에만 signIn 호출
    const nextAuthResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (nextAuthResult?.ok) {
      localStorage.removeItem('cart-storage');
      const from = new URLSearchParams(window.location.search).get('from');
      router.push(from === 'cart' ? '/cart' : '/');
    } else {
      showErrorToast('로그인 세션 생성에 실패했습니다.');
    }
  };

  const checkEmailAvailability = async () => {
    if (!email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setCheckingEmail(true);
    setIsEmailAvailable(null);

    try {
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      setIsEmailAvailable(data.isAvailable);
    } catch (error) {
      toast.error('이메일 확인 중 오류가 발생했습니다.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name) {
      showErrorToast('모든 필드를 입력해주세요.');
      return;
    }

    if (isEmailAvailable === null) {
      showErrorToast('이메일 중복 확인을 해주세요.');
      return;
    }

    if (isEmailAvailable === false) {
      showErrorToast('이미 사용 중인 이메일입니다.');
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast('비밀번호가 일치하지 않습니다.');
      return;
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
        phone,
        postalCode,
        address,
        addressDetail,
      }),
    });

    const data = await res.json();
    const from = params.get('from');

    if (res.ok) {
      showSuccessToast('회원가입이 완료되었습니다.');
      router.push(`/login?tab=login${from === 'cart' ? '&from=cart' : ''}`);
    } else {
      showErrorToast(data.message || '회원가입 중 오류가 발생했습니다.');
    }
  };

  // 주소 api 연동
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleFindPostcode = () => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const fullAddress = data.address;
        const zonecode = data.zonecode;
        setPostalCode(zonecode);
        setAddress(fullAddress);
      },
    }).open();
  };
  return (
    <div className="container flex items-center justify-center py-10 md:py-20">
      <Card className={`mx-auto overflow-hidden transition-all duration-500 ease-in-out ${activeTab === 'register' ? 'w-[640px]' : 'w-[400px]'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="register">회원가입</TabsTrigger>
          </TabsList>
          {/* 로그인 탭 */}
          <TabsContent value="login">
            <CardHeader>
              <CardTitle className="text-2xl text-center">로그인</CardTitle>
              <CardDescription className="text-center">도깨비 테니스 아카데미에 오신 것을 환영합니다.</CardDescription>
            </CardHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" placeholder="이메일 주소를 입력하세요" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">비밀번호</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      비밀번호 찾기
                    </Link>
                  </div>
                  <Input id="password" type="password" placeholder="비밀번호를 입력하세요" />
                </div>
                <Button type="submit" className="w-full" onClick={handleLogin}>
                  로그인
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">또는 SNS 계정으로 로그인</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="w-full">
                    <Image src="/placeholder.svg?height=20&width=20" alt="카카오 로그인" width={20} height={20} className="mr-2" />
                    카카오
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Image src="/placeholder.svg?height=20&width=20" alt="네이버 로그인" width={20} height={20} className="mr-2" />
                    네이버
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Image src="/placeholder.svg?height=20&width=20" alt="구글 로그인" width={20} height={20} className="mr-2" />
                    구글
                  </Button>
                </div>
              </CardContent>
            </form>
            <div className="text-center text-sm text-muted-foreground">
              비회원도 상품 구매가 가능하나 <span className="font-semibold text-primary">다양한 회원혜택</span>에서 제외됩니다.
            </div>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/cart')}>
              비회원으로 구매하기
            </Button>
          </TabsContent>

          {/* 회원가입 탭 */}
          <TabsContent value="register">
            <CardHeader>
              <CardTitle className="text-2xl text-center">회원가입</CardTitle>
              <CardDescription className="text-center">도깨비 테니스 아카데미의 회원이 되어보세요.</CardDescription>
            </CardHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRegister();
              }}
            >
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="register-email">이메일</Label>
                  <div className="flex gap-2">
                    <Input
                      id="register-email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsEmailAvailable(null); // 입력 바뀌면 다시 초기화
                      }}
                      placeholder="example@ddokaebi.com"
                      className="flex-1"
                    />
                    <Button type="button" onClick={checkEmailAvailability} disabled={checkingEmail} variant="outline">
                      {checkingEmail ? '확인 중...' : '중복 확인'}
                    </Button>
                  </div>

                  {isEmailAvailable === true && <p className="text-sm text-green-600 mt-1">✅ 사용 가능한 이메일입니다.</p>}
                  {isEmailAvailable === false && <p className="text-sm text-red-600 mt-1">❌ 이미 사용 중인 이메일입니다.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">비밀번호</Label>
                  <Input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 다시 입력하세요" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처를 입력하세요 ( '-' 제외)" />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="register-postalCode">우편번호</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleFindPostcode}>
                      우편번호 찾기
                    </Button>
                  </div>
                  <Input id="register-postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="우편번호를 입력하세요" readOnly className=" bg-gray-100 cursor-not-allowed max-w-[200px]" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="register-address">기본 배송지 주소</Label>
                  <Input id="register-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="기본 주소를 입력하세요" readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="register-address-detail">상세 주소</Label>
                  <Input id="register-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소를 입력하세요" />
                </div>
                <div className="col-span-2">
                  <Button type="submit" className="w-full" onClick={handleRegister}>
                    회원가입
                  </Button>
                </div>
                <div className="col-span-2">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">또는 SNS 계정으로 가입</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="w-full">
                      <Image src="/placeholder.svg?height=20&width=20" alt="카카오 가입" width={20} height={20} className="mr-2" />
                      카카오
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Image src="/placeholder.svg?height=20&width=20" alt="네이버 가입" width={20} height={20} className="mr-2" />
                      네이버
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Image src="/placeholder.svg?height=20&width=20" alt="구글 가입" width={20} height={20} className="mr-2" />
                      구글
                    </Button>
                  </div>
                </div>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
