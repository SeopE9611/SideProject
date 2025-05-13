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
  _id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
};

const keyMap = {
  power: '반발력',
  durability: '내구성',
  spin: '스핀',
  control: '컨트롤',
  comfort: '편안함',
};

// 브랜드 필터 옵션
const brands = [
  { label: '루키론', value: 'lookielon' },
  { label: '테크니파이버', value: 'technifibre' },
  { label: '윌슨', value: 'wilson' },
  { label: '바볼랏', value: 'babolat' },
  { label: '헤드', value: 'head' },
  { label: '요넥스', value: 'yonex' },
  { label: '소링크', value: 'solinco' },
  { label: '던롭', value: 'dunlop' },
  { label: '감마', value: 'gamma' },
  { label: '프린스', value: 'prince' },
  { label: '키르쉬바움', value: 'kirschbaum' },
  { label: '고센', value: 'gosen' },
];

const brandLabelMap: Record<string, string> = Object.fromEntries(brands.map(({ value, label }) => [value, label]));

export default function FilterableProductList({ products }: { products: Product[] }) {
  // 정렬 옵션상태 관리
  const [sortOption, setSortOption] = useState('latest');

  // 필터 상태 관리
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null); // 선택된 브랜드
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null); // 선택된 반발력
  const [selectedDurability, setSelectedDurability] = useState<number | null>(null); // 선택된 내구성
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null); // 선택된 스핀 성능
  const [selectedControl, setSelectedControl] = useState<number | null>(null); // 선택된 컨트롤
  const [selectedComfort, setSelectedComfort] = useState<number | null>(null); // 선택된 편안함

  // 사용자가 조작중인 값
  // draftFilter: 유저가 조작 중인 임시 상태, 즉시 화면에 반영하지 않음
  const [draftFilter, setDraftFilter] = useState({
    name: '',
    priceRange: [0, 50000],
  });

  // 실제로 화면에 적용된 필터 값
  // appliedFilter: 화면에 실제로 적용된 상태, 이걸 기준으로 상품 필터링
  const [appliedFilter, setAppliedFilter] = useState({
    brand: null,
    bounce: null,
    durability: null,
    spin: null,
    control: null,
    comfort: null,
    name: '',
    priceRange: [0, 50000],
  });

  // 필터링된 상품 목록
  const filteredProducts = products.filter((product) => {
    const features = product.features ?? {};

    const f = {
      ...appliedFilter, // ← draftFilter에서 반영된 name, priceRange
      brand: selectedBrand,
      bounce: selectedBounce,
      durability: selectedDurability,
      spin: selectedSpin,
      control: selectedControl,
      comfort: selectedComfort,
    };

    const brandMatch = f.brand === null ? true : (product.brand ?? '').toLowerCase() === f.brand;

    const bounceMatch = selectedBounce !== null ? (features.power ?? 0) >= selectedBounce : true;

    const durabilityMatch = selectedDurability !== null ? (features.durability ?? 0) >= selectedDurability : true;

    const spinMatch = selectedSpin !== null ? (features.spin ?? 0) >= selectedSpin : true;

    const controlMatch = selectedControl !== null ? (features.control ?? 0) >= selectedControl : true;

    const comfortMatch = selectedComfort !== null ? (features.comfort ?? 0) >= selectedComfort : true;

    const nameMatch = f.name === '' ? true : product.name.includes(f.name);
    const priceMatch = product.price >= f.priceRange[0] && product.price <= f.priceRange[1];

    // console.log('현재 브랜드:', product.brand);
    // console.log('현재 반발력:', product.features?.반발력);
    console.log('선택된 브랜드:', selectedBrand);
    console.log('상품 브랜드:', product.brand);

    return brandMatch && bounceMatch && durabilityMatch && spinMatch && controlMatch && comfortMatch && nameMatch && priceMatch;
  });

  // filteredProducts 정렬 적용
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
        return 0; // 아직 인기순 데이터 없음
      case 'latest':
      default:
        return b._id.localeCompare(a._id);
    }
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
            <Input value={draftFilter.name} onChange={(e) => setDraftFilter((prev) => ({ ...prev, name: e.target.value }))} placeholder="상품명 검색..." />
          </div>
          {/* 가격 범위 */}
          <div className="mb-6">
            <Label className="mb-2 block">가격 범위</Label>
            <div className="space-y-4">
              <Slider value={draftFilter.priceRange} onValueChange={(range) => setDraftFilter((prev) => ({ ...prev, priceRange: range }))} min={0} max={50000} step={500} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{`₩${draftFilter.priceRange[0].toLocaleString()}`}</span>
                <span>{`₩${draftFilter.priceRange[1].toLocaleString()}`}</span>
              </div>
            </div>
          </div>
          {/* 브랜드 필터 */}
          <div className="mb-6">
            <Label htmlFor="brand" className="mb-2 block">
              브랜드
            </Label>
            <Select onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)} value={selectedBrand ?? 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="브랜드 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
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
              <Select onValueChange={(value) => setSelectedBounce(value === 'all' ? null : Number(value))} value={selectedBounce !== null ? String(selectedBounce) : '5'}>
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
              <Label className="mb-2 block text-sm">컨트롤</Label>
              <Select onValueChange={(value) => setSelectedControl(value === 'all' ? null : Number(value))} value={selectedControl !== null ? String(selectedControl) : '5'}>
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
              <Label className="mb-2 block text-sm">스핀</Label>
              <Select onValueChange={(value) => setSelectedSpin(value === 'all' ? null : Number(value))} value={selectedSpin !== null ? String(selectedSpin) : '5'}>
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
          <div>
            <Label className="mb-2 block text-sm">내구성</Label>
            <Select onValueChange={(value) => setSelectedDurability(value === 'all' ? null : Number(value))} value={selectedDurability !== null ? String(selectedDurability) : '5'}>
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
            <Label className="mb-2 block text-sm">편안함</Label>
            <Select onValueChange={(value) => setSelectedComfort(value === 'all' ? null : Number(value))} value={selectedComfort !== null ? String(selectedComfort) : '5'}>
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
          <Button className="w-full mt-6" onClick={() => setAppliedFilter((prev) => ({ ...prev, name: draftFilter.name, priceRange: draftFilter.priceRange }))}>
            필터 적용
          </Button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-muted-foreground">총 {products.length}개 상품</span>
          </div>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value)}>
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
          {sortedProducts.map((product) => (
            <Link key={product._id.toString()} href={`/products/${product._id.toString()}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                <div className="relative">
                  <Image src={(product.images?.[0] as string) || '/placeholder.svg'} alt={product.name} width={200} height={200} className="h-48 w-full object-cover" />
                  {product.isNew && <Badge className="absolute right-2 top-2">NEW</Badge>}
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{brandLabelMap[product.brand.toLowerCase()] ?? product.brand}</div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <div className="mt-2 text-sm space-y-1">
                    {product.features ? (
                      Object.entries(product.features as Record<string, number>).map(([key, value]) => (
                        <div key={key}>
                          {keyMap[key as keyof typeof keyMap] || key}: {'★'.repeat(value)}
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
