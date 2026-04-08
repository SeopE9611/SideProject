import { FormPageSkeleton } from "@/components/system/loading";

export default function Loading() {
  return <FormPageSkeleton className="py-10 min-h-[70svh]" fields={4} />;
}
