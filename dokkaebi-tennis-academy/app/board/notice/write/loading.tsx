import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NoticeWriteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10" />
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
              </div>
            </div>
          </div>

          <Card className="border-0 bg-card dark:bg-card shadow-xl backdrop-blur-sm">
            <CardHeader className="border-b">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
