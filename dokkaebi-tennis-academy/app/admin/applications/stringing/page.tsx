import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/admin/applications/_components/ApplicationStatusSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Application = {
  _id: string;
  name: string;
  phone: string;
  stringDetails: {
    racketType: string;
    stringType: string;
    customStringName?: string;
    preferredDate: string;
    preferredTime: string;
    requirements?: string;
  };
  status: string;
  createdAt: string;
};

async function getApplications() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/applications/stringing/list`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('신청 목록을 불러오지 못했습니다.');
  }

  return res.json();
}

export default async function StringingApplicationPage() {
  const applications = await getApplications();
  return (
    <div className="space-y-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>스트링 장착 서비스 신청 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.map((app: Application) => (
            <Card key={app._id}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">{app.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="text-muted-foreground">{app._id}</div>
                <div>{app.phone}</div>
                <div>
                  희망일시: {app.stringDetails.preferredDate} {app.stringDetails.preferredTime}
                </div>
                <div>스트링 종류: {app.stringDetails.stringType === 'custom' ? app.stringDetails.customStringName : app.stringDetails.stringType}</div>
                <div className="flex justify-end gap-2 pt-2">
                  <ApplicationStatusBadge status={app.status} />
                  <ApplicationStatusSelect currentStatus={app.status} applicationId={String(app._id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
