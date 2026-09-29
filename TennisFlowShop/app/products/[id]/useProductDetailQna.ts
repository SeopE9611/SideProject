import useSWR from "swr";
import type { DetailTab } from "./ProductDetailClient.types";

type UseProductDetailQnaParams = {
  activeTab: DetailTab;
  productId: string;
  fetcher: (url: string) => Promise<any>;
};

export function useProductDetailQna({ activeTab, productId, fetcher }: UseProductDetailQnaParams) {
  const {
    data: qnaData,
    error: qnaError,
    isLoading: qnaLoading,
  } = useSWR(
    activeTab === "qna" ? `/api/products/${productId}/qna?page=1&limit=10` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const qnas = qnaData?.items ?? [];
  const qnaTotal = qnaData?.total ?? 0;

  return {
    qnas,
    qnaTotal,
    qnaLoading,
    qnaError,
  };
}
