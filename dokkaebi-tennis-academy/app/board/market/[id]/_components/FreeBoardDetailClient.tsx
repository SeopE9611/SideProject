'use client';

import BoardDetailClient from '@/app/board/_components/BoardDetailClient';
import type { BoardTypeConfig } from '@/app/board/_components/board-config';

export default function FreeBoardDetailClient({ id, config }: { id: string; config: BoardTypeConfig }) {
  return <BoardDetailClient id={id} config={config} />;
}
