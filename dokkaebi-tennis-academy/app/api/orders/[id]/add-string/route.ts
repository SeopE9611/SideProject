// import { NextRequest, NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';

// // POST: 주문에 스트링 상품 추가
// export async function POST(
//   req: NextRequest, 
//   context: { params: Promise<{ id: string }> }
// ) {
//   const { id: orderId } = await context.params;
  
//   try {
//     if (!ObjectId.isValid(orderId)) {
//       return NextResponse.json({ error: '잘못된 주문 ID' }, { status: 400 });
//     }

//     const body = await req.json();
//     const { productId, quantity = 1 } = body;

//     if (!productId || !ObjectId.isValid(productId)) {
//       return NextResponse.json({ error: '잘못된 상품 ID' }, { status: 400 });
//     }

//     const db = (await clientPromise).db();
    
//     // 1) 주문 존재 확인
//     const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
//     if (!order) {
//       return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
//     }

//     // 2) 스트링 상품 정보 조회
//     const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
//     if (!product) {
//       return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });
//     }

//     // 3) 재고 확인
//     if (product.inventory?.stock < quantity) {
//       return NextResponse.json({ 
//         error: '재고 부족', 
//         currentStock: product.inventory?.stock || 0 
//       }, { status: 400 });
//     }

//     // 4) 이미 같은 상품이 있는지 확인 (중복 방지)
//     const items = order.items || [];
//     const alreadyExists = items.some((item: any) => 
//       item.productId?.toString() === productId
//     );

//     if (alreadyExists) {
//       return NextResponse.json({ 
//         success: true, 
//         message: '이미 추가된 상품입니다' 
//       });
//     }

//     // 5) 주문에 스트링 상품 추가
//     const newItem = {
//       productId: new ObjectId(productId),
//       name: product.name,
//       price: product.price || 0,
//       imageUrl: product.images?.[0] || null,
//       mountingFee: product.mountingFee || 0, // 🔥 장착비 포함
//       quantity,
//       kind: 'product' as const, // 🔥 스트링은 'product'
//     };

//     await db.collection('orders').updateOne(
//       { _id: new ObjectId(orderId) },
//       { 
//         $push: { items: newItem },
//         $inc: { totalPrice: (product.price || 0) * quantity }
//       } as any
//     );

//     // 6) 재고 차감
//     await db.collection('products').updateOne(
//       { _id: new ObjectId(productId) },
//       { 
//         $inc: { 
//           'inventory.stock': -quantity,
//           sold: quantity 
//         } 
//       }
//     );

//     return NextResponse.json({ success: true });
    
//   } catch (error) {
//     console.error('[add-string] 오류:', error);
//     return NextResponse.json({ 
//       error: '스트링 추가 중 오류 발생' 
//     }, { status: 500 });
//   }
// }