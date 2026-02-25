'use client';

import BoardListClient from '@/app/board/_components/BoardListClient';
import type { BoardTypeConfig } from '@/app/board/_components/board-config';

export default function FreeBoardClient({ config }: { config: BoardTypeConfig }) {
  return <BoardListClient config={config} />;
}
