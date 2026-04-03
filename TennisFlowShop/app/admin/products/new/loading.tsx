import { FormPageSkeleton } from "@/components/system/loading";

export default function NewProductLoading() {
  return (
    <FormPageSkeleton
      fields={8}
      className="px-6"
    />
  );
}
