import type { Metadata } from 'next';
import PackageSettingsClient from './PackageSettingsClient';

export const metadata: Metadata = {
  title: '패키지 설정 | 관리자',
  description: '스트링 패키지 상품의 가격과 설정을 관리합니다.',
};

export default function PackageSettingsPage() {
  return <PackageSettingsClient />;
}
