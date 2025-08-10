import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function AccountDeletedLoading() {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center pt-10 pb-6">
          <Skeleton className="h-16 w-16 rounded-full mb-4" />
          <Skeleton className="h-8 w-4/5 mb-2" />
        </CardHeader>

        <CardContent className="text-center pb-6">
          <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pb-10">
          <Skeleton className="h-10 w-full sm:w-32" />
          <Skeleton className="h-10 w-full sm:w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}
