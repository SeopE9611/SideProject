export const BOARD_KINDS = ['free', 'market', 'gear', 'notice', 'qna'] as const;

export type BoardKind = (typeof BOARD_KINDS)[number];

export interface BoardAttachment {
  url: string;
  name: string;
  size?: number;
  mime?: string;
}

export interface BoardPostBase {
  _id?: string;
  kind: BoardKind;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  attachments?: BoardAttachment[];
  viewCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BoardPermissions {
  canRead: boolean;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAnswer?: boolean;
  canReport?: boolean;
}
