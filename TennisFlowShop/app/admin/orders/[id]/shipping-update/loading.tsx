import { FormPageSkeleton } from "@/components/system/loading";

export default function ShippingUpdateLoading() {
  return (
    <FormPageSkeleton
      fields={2}
      className="px-6"
    />
  );
}
