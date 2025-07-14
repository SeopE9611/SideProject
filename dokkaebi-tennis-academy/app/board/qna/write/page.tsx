import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTokenRefresher } from '@/app/api/auth/useTokenRefresher';

export default function QnaWritePage() {
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link href="/board/qna" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Q&A 목록으로 돌아가기
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">문의하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select>
                <SelectTrigger id="category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">상품</SelectItem>
                  <SelectItem value="order">주문/결제</SelectItem>
                  <SelectItem value="delivery">배송</SelectItem>
                  <SelectItem value="refund">환불/교환</SelectItem>
                  <SelectItem value="service">서비스</SelectItem>
                  <SelectItem value="academy">아카데미</SelectItem>
                  <SelectItem value="member">회원</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" placeholder="제목을 입력하세요" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" placeholder="문의 내용을 입력하세요" className="min-h-[200px]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">이미지 첨부 (선택)</Label>
              <Input id="image" type="file" multiple accept="image/*" />
              <p className="text-xs text-muted-foreground">최대 3개까지 첨부 가능합니다. (파일당 최대 5MB)</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="private" />
              <label htmlFor="private" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                비공개 문의로 작성
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/board/qna">취소</Link>
            </Button>
            <Button>등록하기</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
