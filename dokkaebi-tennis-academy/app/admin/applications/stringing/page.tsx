// 사용하지않는 컴포넌트 혹시모를 대비 삭제는안함
// // import StringingApplicationsClient from '@/app/features/stringing-applications/components/StringingApplicationsClient';
// import AccessDenied from '@/components/system/AccessDenied';
// import { getCurrentUser } from '@/lib/hooks/get-current-user';

// export default async function AdminStringingApplicationsPage() {
//   const user = await getCurrentUser();

//   if (!user || user.role !== 'admin') {
//     return <AccessDenied />;
//   }

//   return <StringingApplicationsClient />;
// }
