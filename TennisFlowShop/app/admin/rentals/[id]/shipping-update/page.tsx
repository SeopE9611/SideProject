import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ShippingForm from "./shipping-form";

type RentalShippingUpdatePageProps = {
  params: Promise<{ id: string }>;
};

function ShippingUpdateFallback() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    </div>
  );
}

export default async function Page({ params }: RentalShippingUpdatePageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<ShippingUpdateFallback />}>
      <ShippingForm rentalId={id} />
    </Suspense>
  );
}
