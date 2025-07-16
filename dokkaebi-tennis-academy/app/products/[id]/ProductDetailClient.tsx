'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCartStore } from '@/app/store/cartStore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';
import { User } from '@/app/store/authStore';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function ProductDetailClient({ product }: { product: any }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => res.json())
      .then(({ user }) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // if (!user) return null;

  const handleAddToCart = () => {
    const result = addItem({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '/placeholder.svg',
    });

    if (!result.success) {
      showErrorToast(result.message);
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

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Link href="/products" className="text-primary hover:underline">
          ← 상품 목록으로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* 상품 이미지 */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Image src={product.images[0] || '/placeholder.svg'} alt={product.name} width={600} height={600} className="h-full w-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(product.images as string[]).map((image: string, index: number) => (
              <div key={index} className="overflow-hidden rounded-md border cursor-pointer hover:border-primary">
                <Image src={image || '/placeholder.svg'} alt={`${product.name} ${index + 1}`} width={100} height={100} className="h-20 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="space-y-6">
          <div>
            <div className="text-sm text-muted-foreground">{product.brand}</div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < 4 ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground'}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.reviews.length} 리뷰)</span>
            </div>
          </div>

          <div className="text-3xl font-bold">{product.price.toLocaleString()}원</div>

          <div className="space-y-2">
            <h3 className="font-medium">성능</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm">반발력</div>
                <div className="text-sm">
                  {'★'.repeat(product.features.반발력)}
                  {'☆'.repeat(5 - product.features.반발력)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm">내구성</div>
                <div className="text-sm">
                  {'★'.repeat(product.features.내구성)}
                  {'☆'.repeat(5 - product.features.내구성)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm">스핀</div>
                <div className="text-sm">
                  {'★'.repeat(product.features.스핀)}
                  {'☆'.repeat(5 - product.features.스핀)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">수량:</span>

              <Button variant="outline" size="sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                -
              </Button>

              <span className="w-6 text-center">{quantity}</span>

              <Button variant="outline" size="sm" onClick={() => setQuantity((q) => q + 1)}>
                +
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                장바구니에 담기
              </Button>
              <Button variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                위시리스트에 추가
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <h3 className="font-medium mb-2">배송 정보</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• 3,000원 (30,000원 이상 구매 시 무료배송)</li>
              <li>• 오후 2시 이전 주문 시 당일 출고</li>
              <li>• 스트링 장착 서비스 신청 시 1-2일 추가 소요</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 상품 상세 정보 탭 */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="description">상품 설명</TabsTrigger>
            <TabsTrigger value="specifications">상세 스펙</TabsTrigger>
            <TabsTrigger value="reviews">리뷰 ({product.reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p>{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specifications as Record<string, string>).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-b-0">
                      <th className="bg-muted px-4 py-3 text-left font-medium w-1/4">{key}</th>
                      <td className="px-4 py-3">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">고객 리뷰</h3>
                <Button>리뷰 작성하기</Button>
              </div>

              <div className="space-y-4">
                {(product.reviews as any[]).map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{review.user}</div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{review.date}</div>
                      </div>
                      <p className="mt-2 text-sm">{review.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 관련 상품 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">관련 상품</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(product.relatedProducts as any[]).map((relatedProduct) => (
            <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                <div className="p-2">
                  <Image src={relatedProduct.image || '/placeholder.svg'} alt={relatedProduct.name} width={100} height={100} className="h-32 w-full object-cover" />
                  <div className="p-2">
                    <div className="font-medium line-clamp-2">{relatedProduct.name}</div>
                    <div className="mt-1 font-bold text-sm">{relatedProduct.price.toLocaleString()}원</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
