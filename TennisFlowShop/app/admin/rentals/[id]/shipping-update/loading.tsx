import { FormPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <FormPageSkeleton
      fields={3}
      className="px-6"
    />
  );
}
