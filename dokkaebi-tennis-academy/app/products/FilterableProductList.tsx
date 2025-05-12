'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

type Product = {
  _id: { toString: () => string }; // MongoDB ObjectId
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
};

export default function FilterableProductList({ products }: { products: Product[] }) {
  // 필터 상태 관리
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null); // 선택된 브랜드
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null); // 선택된 반발력
  const [selectedDurbility, setSelectedDurability] = useState<number | null>(null); // 선택된 내구성
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null); // 선택된 스핀 성능

  // 브랜드 필터 옵션
  const brands = ['루키론', '테크니파이버', '윌슨', '바볼랏', '헤드', '요넥스', '소링크', '던롭'];

  // 필터링된 상품 목록
  const filteredProducts = products.filter((product) => {
    const features = product.features as Record<string, number> | undefined;

    return (!selectedBounce || (features?.반발력 ?? 0) >= selectedBounce) && (!selectedDurbility || (features?.내구성 ?? 0) >= selectedDurbility) && (!selectedSpin || (features?.스핀 ?? 0) >= selectedSpin);
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      {/* 필터 사이드바 */}
      <div className="space-y-6 lg:col-span-1">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold text-lg mb-4">필터</h2>

          {/* 검색 */}
          <div className="mb-6">
            <Label htmlFor="search" className="mb-2 block">
              검색
            </Label>
            <Input id="search" placeholder="상품명 검색..." />
          </div>

          {/* 가격 범위 */}
          <div className="mb-6">
            <Label className="mb-2 block">가격 범위</Label>
            <div className="space-y-4">
              <Slider defaultValue={[0, 50000]} min={0} max={50000} step={1000} />
              <div className="flex items-center justify-between">
                <span>₩0</span>
                <span>₩50,000</span>
              </div>
            </div>
          </div>

          {/* 브랜드 필터 */}
          <div className="mb-6">
            <Label htmlFor="brand" className="mb-2 block">
              브랜드
            </Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="브랜드 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand.toLowerCase()}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 성능 필터 */}
          <div className="space-y-4">
            <h3 className="font-medium">성능</h3>

            <div>
              <Label className="mb-2 block text-sm">반발력</Label>
              <Select onValueChange={(value) => setSelectedBounce(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">★★★★★</SelectItem>
                  <SelectItem value="4">★★★★☆ 이상</SelectItem>
                  <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-sm">내구성</Label>
              <Select onValueChange={(value) => setSelectedDurability(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">★★★★★</SelectItem>
                  <SelectItem value="4">★★★★☆ 이상</SelectItem>
                  <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-sm">스핀 성능</Label>
              <Select onValueChange={(value) => setSelectedSpin(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">★★★★★</SelectItem>
                  <SelectItem value="4">★★★★☆ 이상</SelectItem>
                  <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full mt-6">필터 적용</Button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-muted-foreground">총 {products.length}개 상품</span>
          </div>
          <Select defaultValue="latest">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="정렬 기준" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="popular">인기순</SelectItem>
              <SelectItem value="price-low">가격 낮은순</SelectItem>
              <SelectItem value="price-high">가격 높은순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Link key={product._id.toString()} href={`/products/${product._id.toString()}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                <div className="relative">
                  <Image src={(product.images?.[0] as string) || '/placeholder.svg'} alt={product.name} width={200} height={200} className="h-48 w-full object-cover" />
                  {product.isNew && <Badge className="absolute right-2 top-2">NEW</Badge>}
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{product.brand}</div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <div className="mt-2 text-sm space-y-1">
                    {product.features ? (
                      Object.entries(product.features as Record<string, number>).map(([key, value]) => (
                        <div key={key}>
                          {key}: {'★'.repeat(value)}
                          {'☆'.repeat(5 - value)}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">성능 정보 없음</div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <div className="font-bold">{product.price.toLocaleString()}원</div>
                  <Button variant="secondary" size="sm">
                    상세보기
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
