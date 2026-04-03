import { FormPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return (
    <FormPageSkeleton
      fields={6}
      className="px-6"
    />
  );
}
