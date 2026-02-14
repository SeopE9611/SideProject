import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToLegacyAdminRoute(req, `/api/reviews/${id}`, 'GET');
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToLegacyAdminRoute(req, `/api/reviews/${id}`, 'PATCH');
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToLegacyAdminRoute(req, `/api/reviews/${id}`, 'DELETE');
}
