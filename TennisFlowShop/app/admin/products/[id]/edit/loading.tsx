import { FormPageSkeleton } from "@/components/system/loading";

export default function EditProductLoading() {
  return (
    <FormPageSkeleton
      fields={8}
      className="px-6"
    />
  );
}
