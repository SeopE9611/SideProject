'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';

// 브랜드 목록
const brands = [
  { id: 'luxilon', name: '루키론' },
  { id: 'technifibre', name: '테크니파이버' },
  { id: 'wilson', name: '윌슨' },
  { id: 'babolat', name: '바볼랏' },
  { id: 'head', name: '헤드' },
  { id: 'yonex', name: '요넥스' },
  { id: 'solinco', name: '소링크' },
  { id: 'dunlop', name: '던롭' },
  { id: 'gamma', name: '감마' },
  { id: 'prince', name: '프린스' },
  { id: 'kirschbaum', name: '키르쉬바움' },
  { id: 'gosen', name: '고센' },
];

// 게이지 옵션
const gauges = [
  { id: '15L', name: '1.35mm (15L)' },
  { id: '16', name: '1.30mm (16)' },
  { id: '16L', name: '1.28mm (16L)' },
  { id: '17', name: '1.25mm (17)' },
  { id: '17L', name: '1.20mm (17L)' },
  { id: '18', name: '1.15mm (18)' },
];

// 재질 옵션
const materials = [
  { id: 'polyester', name: '폴리에스터' },
  { id: 'multifilament', name: '멀티필라멘트' },
  { id: 'natural_gut', name: '천연 거트' },
  { id: 'synthetic_gut', name: '합성 거트' },
  { id: 'hybrid', name: '하이브리드' },
];

// 색상 옵션
const colors = [
  { id: 'black', name: '블랙' },
  { id: 'white', name: '화이트' },
  { id: 'red', name: '레드' },
  { id: 'blue', name: '블루' },
  { id: 'yellow', name: '옐로우' },
  { id: 'green', name: '그린' },
  { id: 'orange', name: '오렌지' },
  { id: 'silver', name: '실버' },
  { id: 'gold', name: '골드' },
  { id: 'transparent', name: '투명' },
];

export default function NewStringPage() {
  // 기본 정보를 useState로 상태 통제
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    sku: '',
    shortDescription: '',
    description: '',
    brand: '',
    material: '',
    gauge: '',
    color: '',
    length: '',
    price: 0,
  });

  // 성능 및 특성 정보를 useState로 상태 통제
  const [features, setFeatures] = useState({
    power: 3,
    control: 3,
    spin: 3,
    durability: 3,
    comfort: 3,
  });

  // 태그 정보를 useState로 상태 통제
  const [tags, setTags] = useState({
    beginner: false,
    intermediate: false,
    advanced: false,
    baseline: false,
    serveVolley: false,
    allCourt: false,
    power: false,
  });

  // 추가 특성 정보
  const [additionalFeatures, setAdditionalFeatures] = useState('');

  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [images, setImages] = useState<string[]>([]);
  const [powerRating, setPowerRating] = useState([3]);
  const [controlRating, setControlRating] = useState([3]);
  const [spinRating, setSpinRating] = useState([3]);
  const [durabilityRating, setDurabilityRating] = useState([3]);
  const [comfortRating, setComfortRating] = useState([3]);

  // 이미지 추가 핸들러 (실제로는 파일 업로드 로직이 필요합니다)
  const handleAddImage = () => {
    // 실제 구현에서는 파일 업로드 후 URL을 받아와야 합니다
    const newImageUrl = `/placeholder.svg?height=200&width=200&text=스트링이미지${images.length + 1}`;
    setImages([...images, newImageUrl]);
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // specifications 영문 키로 미리 구성
    const specifications = {
      material: basicInfo.material,
      gauge: basicInfo.gauge,
      color: basicInfo.color,
      length: basicInfo.length,
    };

    //  product 전체 구성
    const product = {
      ...basicInfo, // name, brand, price 등 기본 항목

      features: {
        ...features, // power, control, spin 등 성능 항목
      },

      tags: { ...tags }, // 추천 플레이어 & 스타일

      specifications, // 영문 키로 통일된 사양 정보

      additionalFeatures, // 추가 설명

      images, // 이미지 배열
    };

    console.log('✅ 등록된 상품 데이터:', product);

    // 추후 API 전송 로직 위치
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">스트링 등록</h2>
          <p className="text-muted-foreground">새로운 테니스 스트링 정보를 입력하고 등록하세요.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              취소
            </Link>
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="features">성능 및 특성</TabsTrigger>
          <TabsTrigger value="inventory">재고 관리</TabsTrigger>
          <TabsTrigger value="images">이미지</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>스트링의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="string-name">
                    스트링명 <span className="text-destructive">*</span>
                  </Label>
                  <Input id="string-name" placeholder="스트링명을 입력하세요" required value={basicInfo.name} onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="string-sku">SKU (재고 관리 코드)</Label>
                  <Input id="string-sku" placeholder="예: STR-LUX-001" value={basicInfo.sku} onChange={(e) => setBasicInfo({ ...basicInfo, sku: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="string-short-description">짧은 설명</Label>
                <Textarea
                  id="string-short-description"
                  placeholder="스트링에 대한 짧은 설명을 입력하세요"
                  className="min-h-[80px]"
                  value={basicInfo.shortDescription}
                  onChange={(e) => setBasicInfo({ ...basicInfo, shortDescription: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="string-description">상세 설명</Label>
                <Textarea id="string-description" placeholder="스트링에 대한 상세 설명을 입력하세요" className="min-h-[200px]" value={basicInfo.description} onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="string-brand">브랜드</Label>
                  <Select value={basicInfo.brand} onValueChange={(value) => setBasicInfo({ ...basicInfo, brand: value })}>
                    <SelectTrigger id="string-brand">
                      <SelectValue placeholder="브랜드 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="string-material">재질</Label>
                  <Select value={basicInfo.material} onValueChange={(value) => setBasicInfo({ ...basicInfo, material: value })}>
                    <SelectTrigger id="string-material">
                      <SelectValue placeholder="재질 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="string-gauge">게이지</Label>
                  <Select value={basicInfo.gauge} onValueChange={(value) => setBasicInfo({ ...basicInfo, gauge: value })}>
                    <SelectTrigger id="string-gauge">
                      <SelectValue placeholder="게이지 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {gauges.map((gauge) => (
                        <SelectItem key={gauge.id} value={gauge.id}>
                          {gauge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="string-color">색상</Label>
                  <Select value={basicInfo.color} onValueChange={(value) => setBasicInfo({ ...basicInfo, color: value })}>
                    <SelectTrigger id="string-color">
                      <SelectValue placeholder="색상 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          {color.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="string-length">길이 (m)</Label>
                  <Select value={basicInfo.length} onValueChange={(value) => setBasicInfo({ ...basicInfo, length: value })}>
                    <SelectTrigger id="string-length">
                      <SelectValue placeholder="길이 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12.2">12.2m</SelectItem>
                      <SelectItem value="12">12m</SelectItem>
                      <SelectItem value="11.7">11.7m</SelectItem>
                      <SelectItem value="6.1">6.1m (하프셋)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="string-regular-price">
                    가격 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex">
                    <Input id="string-regular-price" type="number" min="0" step="1000" placeholder="0" required value={basicInfo.price} onChange={(e) => setBasicInfo({ ...basicInfo, price: Number(e.target.value) })} />
                    <span className="ml-2 flex items-center text-sm">원</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 성능 및 특성 탭 */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>성능 및 특성</CardTitle>
              <CardDescription>스트링의 성능과 특성을 설정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="power-rating">반발력</Label>
                  <span className="font-medium">{features.power}/5</span>
                </div>
                <Slider id="power-rating" min={1} max={5} step={1} value={[features.power]} onValueChange={(value) => setFeatures({ ...features, power: value[0] })} className="w-full h-4" />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="control-rating">컨트롤</Label>
                  <span className="font-medium">{features.control}/5</span>
                </div>
                <Slider id="control-rating" min={1} max={5} step={1} value={[features.control]} onValueChange={(value) => setFeatures({ ...features, control: value[0] })} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="spin-rating">스핀</Label>
                  <span className="font-medium">{features.spin}/5</span>
                </div>
                <Slider id="spin-rating" min={1} max={5} step={1} value={[features.spin]} onValueChange={(value) => setFeatures({ ...features, spin: value[0] })} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="durability-rating">내구성</Label>
                  <span className="font-medium">{features.durability}/5</span>
                </div>
                <Slider id="durability-rating" min={1} max={5} step={1} value={[features.durability]} onValueChange={(value) => setFeatures({ ...features, durability: value[0] })} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="comfort-rating">편안함</Label>
                  <span className="font-medium">{features.comfort}/5</span>
                </div>
                <Slider id="comfort-rating" min={1} max={5} step={1} value={[features.comfort]} onValueChange={(value) => setFeatures({ ...features, comfort: value[0] })} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">추천 플레이어 타입</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="player-beginner" checked={tags.beginner} onCheckedChange={(checked) => setTags({ ...tags, beginner: checked })} />
                    <Label htmlFor="player-beginner">초보자</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="player-intermediate" checked={tags.intermediate} onCheckedChange={(checked) => setTags({ ...tags, intermediate: checked })} />
                    <Label htmlFor="player-intermediate">중급자</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="player-advanced" checked={tags.advanced} onCheckedChange={(checked) => setTags({ ...tags, advanced: checked })} />
                    <Label htmlFor="player-advanced">상급자</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">추천 플레이 스타일</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="style-baseline" checked={tags.baseline} onCheckedChange={(checked) => setTags({ ...tags, baseline: checked })} />
                    <Label htmlFor="style-baseline">베이스라인 플레이어</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="style-serve-volley" checked={tags.serveVolley} onCheckedChange={(checked) => setTags({ ...tags, serveVolley: checked })} />
                    <Label htmlFor="style-serve-volley">서브 앤 발리 플레이어</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="style-all-court" checked={tags.allCourt} onCheckedChange={(checked) => setTags({ ...tags, allCourt: checked })} />
                    <Label htmlFor="style-all-court">올코트 플레이어</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="style-power" checked={tags.power} onCheckedChange={(checked) => setTags({ ...tags, power: checked })} />
                    <Label htmlFor="style-power">파워 히터</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="string-features">추가 특성</Label>
                <Textarea id="string-features" placeholder="스트링의 추가 특성이나 장점을 입력하세요" className="min-h-[100px]" value={additionalFeatures} onChange={(e) => setAdditionalFeatures(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 재고 관리 탭 */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>재고 관리</CardTitle>
              <CardDescription>스트링의 재고 관련 정보를 설정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="string-stock">재고 수량</Label>
                  <Input id="string-stock" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="string-low-stock">재고 부족 알림 기준</Label>
                  <Input id="string-low-stock" type="number" min="0" placeholder="5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>재고 상태</Label>
                <RadioGroup defaultValue="instock">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="instock" id="instock" />
                    <Label htmlFor="instock">재고 있음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outofstock" id="outofstock" />
                    <Label htmlFor="outofstock">품절</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="backorder" id="backorder" />
                    <Label htmlFor="backorder">입고 예정</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="string-manage-stock" />
                  <Label htmlFor="string-manage-stock">재고 관리 사용</Label>
                </div>
                <p className="text-sm text-muted-foreground">재고 관리를 사용하면 판매될 때마다 재고가 자동으로 감소합니다.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="string-backorders" />
                  <Label htmlFor="string-backorders">품절 시 주문 허용</Label>
                </div>
                <p className="text-sm text-muted-foreground">재고가 없을 때도 고객이 주문할 수 있도록 허용합니다.</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">판매 옵션</h3>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="string-featured" />
                    <Label htmlFor="string-featured">추천 상품으로 표시</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="string-new" />
                    <Label htmlFor="string-new">신상품으로 표시</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="string-sale" />
                    <Label htmlFor="string-sale">할인 상품으로 표시</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="string-sale-price">할인가</Label>
                  <div className="flex">
                    <Input id="string-sale-price" type="number" min="0" step="1000" placeholder="0" />
                    <span className="ml-2 flex items-center text-sm">원</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이미지 탭 */}
        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>스트링 이미지</CardTitle>
              <CardDescription>스트링의 이미지를 추가하세요. 첫 번째 이미지가 대표 이미지로 사용됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => (
                  <div key={index} className="relative rounded-md border bg-muted/40">
                    <img src={image || '/placeholder.svg'} alt={`스트링 이미지 ${index + 1}`} className="aspect-square h-full w-full rounded-md object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute right-1 top-1 h-6 w-6" onClick={() => handleRemoveImage(index)}>
                      <span className="sr-only">이미지 삭제</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                    {index === 0 && <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">대표</span>}
                  </div>
                ))}
                <Button type="button" variant="outline" className="flex aspect-square h-full w-full flex-col items-center justify-center rounded-md border border-dashed" onClick={handleAddImage}>
                  <Upload className="mb-2 h-6 w-6" />
                  <span className="text-sm">이미지 추가</span>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center">
                      <Info className="mr-1 h-4 w-4" />
                      이미지 권장 사항
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>최적의 표시를 위해 1000x1000 픽셀 이상의 정사각형 이미지를 사용하세요.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" type="button" asChild>
          <Link href="/admin/products">취소</Link>
        </Button>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
