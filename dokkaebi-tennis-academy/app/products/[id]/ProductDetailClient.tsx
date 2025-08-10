'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, ArrowLeft, Truck, Shield, Clock, ChevronLeft, ChevronRight, Zap, RotateCcw, Plus, Minus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/app/store/cartStore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { User } from '@/app/store/authStore';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function ProductDetailClient({ product }: { product: any }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const stock = product.inventory?.stock ?? 0;

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if ('error' in data) {
          setUser(null);
        } else {
          setUser(data);
        }
      })
      .catch(() => {
        // console.log('요청 실패');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        // console.log('로딩 완료');
      });
  }, []);

  const handleAddToCart = () => {
    if (loading) return;
    // 재고 검증 (기존 장바구니에 담긴 수량 + 지금 선택 수량이 stock 초과인지)
    const wouldBe = quantity;
    if (wouldBe > stock) {
      showErrorToast(`재고가 부족합니다. 현재 재고: ${stock}개`);
      return;
    }
    const result = addItem({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '/placeholder.svg',
      // stock: product.inventory?.stock,
      stock,
    });

    if (!result.success) {
      showErrorToast(result.message ?? '오류');
      return;
    }

    if (!user) {
      toast('장바구니에 담았습니다', {
        description: (
          <>
            <p className="text-sm">비회원이신 경우 로그인 또는</p>
            <p className="text-sm">비회원 주문하기로 진행하세요.</p>
          </>
        ),
        action: {
          label: '로그인하기',
          onClick: () => router.push('/login?from=cart'),
        },
      });
    } else {
      showSuccessToast('장바구니에 담았습니다.');
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    if (!isWishlisted) {
      showSuccessToast('위시리스트에 추가되었습니다.');
    } else {
      showSuccessToast('위시리스트에서 제거되었습니다.');
    }
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const averageRating = product.reviews.length > 0 ? product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / product.reviews.length : 0;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Hero Section with Breadcrumb */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white py-8">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container relative z-10">
          <div className="flex items-center gap-2 text-sm mb-4 opacity-90">
            <Link href="/" className="hover:text-blue-200 transition-colors">
              홈
            </Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-200 transition-colors">
              상품
            </Link>
            <span>/</span>
            <span className="text-blue-200">{product.name}</span>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10 mb-4 p-0" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            이전 페이지로
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 상품 이미지 */}
          <div className="space-y-4">
            <Card className="overflow-hidden border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <div className="relative aspect-square">
                <Image src={product.images[selectedImageIndex] || '/placeholder.svg?height=600&width=600&query=tennis string product'} alt={product.name} fill className="object-cover transition-transform duration-300 hover:scale-105" />
                {product.images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={prevImage}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={nextImage}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white">NEW</Badge>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">정품</Badge>
                </div>
              </div>
            </Card>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image: string, index: number) => (
                  <Card key={index} className={`overflow-hidden cursor-pointer transition-all duration-200 ${selectedImageIndex === index ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedImageIndex(index)}>
                    <div className="aspect-square relative">
                      <Image src={image || '/placeholder.svg?height=100&width=100&query=tennis string thumbnail'} alt={`${product.name} ${index + 1}`} fill className="object-cover" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Brand and Title */}
                  <div>
                    <Badge variant="outline" className="mb-2 text-blue-600 border-blue-200">
                      {product.brand}
                    </Badge>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{product.name}</h1>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-5 w-5 ${i < Math.floor(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {averageRating.toFixed(1)} ({product.reviews.length} 리뷰)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-blue-600">{product.price.toLocaleString()}원</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <>
                          <span className="text-lg text-muted-foreground line-through">{product.originalPrice.toLocaleString()}원</span>
                          <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white">{Math.round((1 - product.price / product.originalPrice) * 100)}% 할인</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">성능 특성</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                        <Zap className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-sm font-medium">반발력</div>
                        <div className="text-xs mt-1">
                          {'★'.repeat(product.features?.반발력 || 3)}
                          {'☆'.repeat(5 - (product.features?.반발력 || 3))}
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                        <Shield className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="text-sm font-medium">내구성</div>
                        <div className="text-xs mt-1">
                          {'★'.repeat(product.features?.내구성 || 4)}
                          {'☆'.repeat(5 - (product.features?.내구성 || 4))}
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                        <RotateCcw className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-sm font-medium">스핀</div>
                        <div className="text-xs mt-1">
                          {'★'.repeat(product.features?.스핀 || 3)}
                          {'☆'.repeat(5 - (product.features?.스핀 || 3))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">수량:</span>
                      <div className="flex items-center border rounded-lg">
                        <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-10 w-10">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (quantity + 1 > stock) {
                              showErrorToast(`더 이상 담을 수 없습니다. 재고: ${stock}개`);
                              return;
                            }
                            setQuantity(quantity + 1);
                          }}
                          className="h-10 w-10"
                          disabled={quantity >= stock} // 버튼 비활성화
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {product.inventory?.manageStock && product.inventory.stock <= 5 && product.inventory.stock > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20 dark:border-orange-800">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-700 dark:text-orange-300">현재 남은 수량이 {product.inventory.stock}개입니다.</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {product.inventory?.manageStock && product.inventory.stock <= 0 ? (
                        <Button disabled className="flex-1 bg-red-100 text-red-600 border border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-600 cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900">
                          <X className="mr-2 h-4 w-4" />
                          재고가 소진되었습니다
                        </Button>
                      ) : (
                        <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" onClick={handleAddToCart} disabled={loading || quantity > stock}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          장바구니에 담기
                        </Button>
                      )}

                      <Button variant="outline" onClick={handleWishlist} className={`${isWishlisted ? 'bg-red-50 border-red-200 text-red-600' : ''}`}>
                        <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                        위시리스트
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 dark:from-blue-900/20 dark:to-purple-900/20 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Truck className="mr-2 h-5 w-5 text-blue-600" />
                        배송 정보
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>3,000원 (30,000원 이상 구매 시 무료배송)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>오후 2시 이전 주문 시 당일 출고</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>스트링 장착 서비스 신청 시 1-2일 추가 소요</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 상품 상세 정보 탭 */}
        <Card className="mt-12 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-14 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <TabsTrigger value="description" className="text-base font-medium">
                  상품 설명
                </TabsTrigger>
                <TabsTrigger value="specifications" className="text-base font-medium">
                  상세 스펙
                </TabsTrigger>
                <TabsTrigger value="reviews" className="text-base font-medium">
                  리뷰 ({product.reviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-8">
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-4">상품 설명</h3>
                  <p className="text-muted-foreground leading-relaxed">{product.description || '이 제품은 최고급 소재로 제작된 프리미엄 테니스 스트링입니다. 뛰어난 반발력과 내구성을 자랑하며, 모든 레벨의 플레이어에게 적합합니다.'}</p>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">상세 스펙</h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(
                          product.specifications || {
                            게이지: '1.25mm',
                            길이: '12m',
                            소재: '폴리에스터',
                            색상: '내추럴',
                            제조국: '독일',
                          }
                        ).map(([key, value]) => (
                          <tr key={key} className="border-b last:border-b-0">
                            <th className="bg-muted px-6 py-4 text-left font-medium w-1/4">{key}</th>
                            <td className="px-6 py-4">{value as string}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">고객 리뷰</h3>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">리뷰 작성하기</Button>
                  </div>

                  <div className="space-y-4">
                    {product.reviews.length > 0 ? (
                      product.reviews.map((review: any, index: number) => (
                        <Card key={index} className="border border-gray-200">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">{review.user?.charAt(0) || 'U'}</div>
                                <div>
                                  <div className="font-medium">{review.user || '익명'}</div>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-4 w-4 ${i < (review.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">{review.date || '2024-01-01'}</div>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">{review.content || '좋은 제품입니다. 추천합니다!'}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">아직 리뷰가 없습니다</h3>
                        <p className="text-muted-foreground mb-4">첫 번째 리뷰를 작성해보세요!</p>
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">리뷰 작성하기</Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-12">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">관련 상품</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {(product.relatedProducts?.length > 0
                  ? product.relatedProducts
                  : [
                      {
                        id: '1',
                        name: 'Wilson Pro Staff String',
                        price: 45000,
                        image: '/placeholder.svg?height=200&width=200',
                      },
                      {
                        id: '2',
                        name: 'Babolat RPM Blast',
                        price: 38000,
                        image: '/placeholder.svg?height=200&width=200',
                      },
                      {
                        id: '3',
                        name: 'Luxilon ALU Power',
                        price: 52000,
                        image: '/placeholder.svg?height=200&width=200',
                      },
                      {
                        id: '4',
                        name: 'Head Hawk String',
                        price: 41000,
                        image: '/placeholder.svg?height=200&width=200',
                      },
                    ]
                ).map((relatedProduct: any) => (
                  <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`}>
                    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                      <div className="relative aspect-square overflow-hidden">
                        <Image src={relatedProduct.image || '/placeholder.svg?height=200&width=200&query=tennis string product'} alt={relatedProduct.name} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <CardContent className="p-4">
                        <div className="font-medium line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">{relatedProduct.name}</div>
                        <div className="font-bold text-blue-600">{relatedProduct.price.toLocaleString()}원</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
