import { FormPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <FormPageSkeleton
      fields={4}
      className="px-4"
    />
  );
}
