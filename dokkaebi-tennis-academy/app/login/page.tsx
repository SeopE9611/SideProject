'use client'
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = async () => {
    const email = (document.getElementById("email") as HTMLInputElement)?.value
    const password = (document.getElementById("password") as HTMLInputElement)?.value
  
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    
    if (result?.ok) {
      router.push("/")
    } else {
      alert("이메일과 비밀번호를 확인해주세요.")
    }
  }
  
  const handleRegister = async () => {
    const email = (document.getElementById("register-email") as HTMLInputElement)?.value
    const password = (document.getElementById("register-password") as HTMLInputElement)?.value
    const confirmPassword = (document.getElementById("confirm-password") as HTMLInputElement)?.value
    const name = (document.getElementById("name") as HTMLInputElement)?.value
  
    if (!email || !password || !confirmPassword || !name) {
      alert("모든 필드를 입력해주세요.")
      return
    }
  
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }
  
    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    })
  
    const data = await res.json()
  
    if (res.ok) {
      alert("회원가입이 완료되었습니다.")
      router.push("/")
    } else {
      alert(data.message || "회원가입 중 오류가 발생했습니다.")
    }
  }
  return (
    <div className="container flex items-center justify-center py-10 md:py-20">
      <Card className="mx-auto max-w-md w-full">
        <Tabs defaultValue="login" className="w-full">
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
              <Button className="w-full" onClick={handleLogin}>로그인</Button>

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
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="카카오 로그인"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  카카오
                </Button>
                <Button variant="outline" className="w-full">
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="네이버 로그인"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  네이버
                </Button>
                <Button variant="outline" className="w-full">
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="구글 로그인"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  구글
                </Button>
              </div>
            </CardContent>
          </TabsContent>

          {/* 회원가입 탭 */}
          <TabsContent value="register">
            <CardHeader>
              <CardTitle className="text-2xl text-center">회원가입</CardTitle>
              <CardDescription className="text-center">도깨비 테니스 아카데미의 회원이 되어보세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">이메일</Label>
                <Input id="register-email" type="email" placeholder="이메일 주소를 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">비밀번호</Label>
                <Input id="register-password" type="password" placeholder="비밀번호를 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input id="confirm-password" type="password" placeholder="비밀번호를 다시 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" placeholder="이름을 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input id="phone" placeholder="연락처를 입력하세요" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    <span>
                      <Link href="/terms" className="text-primary hover:underline">
                        이용약관
                      </Link>{" "}
                      및{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        개인정보처리방침
                      </Link>
                      에 동의합니다.
                    </span>
                  </label>
                </div>
              </div>
              <Button className="w-full" onClick={handleRegister}>회원가입</Button>

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
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="카카오 가입"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  카카오
                </Button>
                <Button variant="outline" className="w-full">
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="네이버 가입"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  네이버
                </Button>
                <Button variant="outline" className="w-full">
                  <Image
                    src="/placeholder.svg?height=20&width=20"
                    alt="구글 가입"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  구글
                </Button>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
