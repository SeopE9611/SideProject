export type UserRoleFilter = 'all' | 'user' | 'admin';
export type UserStatusFilter = 'all' | 'active' | 'deleted' | 'suspended';
export type UserSortFilter = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
export type UserSignupFilter = 'all' | 'local' | 'kakao' | 'naver';
export type UserLoginFilter = 'all' | 'nologin' | 'recent30' | 'recent90';

export interface AdminUsersListRequestDto {
  page: number;
  limit: number;
  q: string;
  role: UserRoleFilter;
  status: UserStatusFilter;
  sort: UserSortFilter;
  signup: UserSignupFilter;
  login: UserLoginFilter;
}

export interface AdminUserListItemDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addressDetail: string;
  postalCode: string;
  pointsBalance: number;
  role: 'user' | 'admin';
  isDeleted: boolean;
  isSuspended: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  socialProviders: Array<'kakao' | 'naver'>;
}

export interface AdminUsersCountersDto {
  total: number;
  active: number;
  deleted: number;
  admins: number;
  suspended: number;
}

export interface AdminUsersListResponseDto {
  items: AdminUserListItemDto[];
  total: number;
  counters: AdminUsersCountersDto;
}

export interface UserCleanupPreviewCandidateDto {
  _id: string;
  name?: string;
  email?: string;
}

export interface AdminErrorPayload {
  message: string;
}
