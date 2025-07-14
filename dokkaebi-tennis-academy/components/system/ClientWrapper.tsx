'use client';

import { GlobalTokenGuard } from './GlobalTokenGuard';

export default function ClientWrapper() {
  return <GlobalTokenGuard />;
}
