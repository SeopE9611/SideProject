import Image from "next/image";

type AdminContentMediaSummaryProps = {
  headingId: string;
  readOnlyReason: "state" | "permission";
  currentCover: { title: string; altText: string; mediaUrl: string; publiclyAvailable: boolean } | null;
  currentAttachment: { label: string; originalFileName: string; byteSize: number; downloadUrl: string } | null;
};

export function AdminContentMediaSummary({
  headingId,
  readOnlyReason,
  currentCover,
  currentAttachment,
}: AdminContentMediaSummaryProps) {
  return (
    <section className="admin-section space-y-5 text-safe-wrap" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-heading font-bold">
        대표 이미지·첨부파일
      </h2>
      <p className="text-small text-muted-foreground">
        {readOnlyReason === "state"
          ? "현재 게시·승인 상태에서는 대표 이미지와 첨부파일을 수정할 수 없습니다."
          : "대표 이미지와 첨부파일을 수정할 권한이 없습니다."}
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h3 className="font-bold">대표 이미지</h3>
          {currentCover ? (
            <>
              <p>{currentCover.title}</p>
              {currentCover.publiclyAvailable ? (
                <>
                  <p className="text-small text-muted-foreground">홈페이지에 표시 가능한 사진입니다.</p>
                  {currentCover.mediaUrl ? (
                    <Image
                      unoptimized
                      src={currentCover.mediaUrl}
                      alt={currentCover.altText}
                      width={160}
                      height={96}
                      className="h-auto max-h-32 max-w-full object-contain"
                    />
                  ) : null}
                </>
              ) : (
                <p role="alert" className="text-small text-warning">
                  현재 연결된 활동사진은 공개할 수 없어 홈페이지에 표시되지 않습니다.
                </p>
              )}
            </>
          ) : (
            <p className="text-small text-muted-foreground">등록된 대표 이미지가 없습니다.</p>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="font-bold">PDF 첨부파일</h3>
          {currentAttachment ? (
            <>
              <dl className="space-y-2">
                <div className="min-w-0">
                  <dt className="text-small text-muted-foreground">원본 파일명</dt>
                  <dd>{currentAttachment.originalFileName}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-small text-muted-foreground">공개 링크 문구</dt>
                  <dd>{currentAttachment.label}</dd>
                </div>
                <div>
                  <dt className="text-small text-muted-foreground">파일 크기</dt>
                  <dd>{currentAttachment.byteSize.toLocaleString()} bytes</dd>
                </div>
              </dl>
              <a
                href={currentAttachment.downloadUrl}
                download
                aria-label={`${currentAttachment.originalFileName} 내려받기`}
                className="inline-flex min-h-11 max-w-full items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                PDF 내려받기
              </a>
            </>
          ) : (
            <p className="text-small text-muted-foreground">등록된 첨부파일이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}
