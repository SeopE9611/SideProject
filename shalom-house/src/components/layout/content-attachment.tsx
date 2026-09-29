type ContentAttachmentProps = {
  headingId: string;
  attachment: { label: string; originalFileName: string; byteSize: number; href: string } | null;
};

export function ContentAttachment({ headingId, attachment }: ContentAttachmentProps) {
  return (
    <section aria-labelledby={headingId} className="border-y border-border py-5">
      <h2 id={headingId} className="text-lg font-bold">
        첨부파일
      </h2>
      {attachment ? (
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-safe-wrap font-medium">{attachment.label}</p>
            <p className="text-safe-wrap mt-1 text-small text-muted-foreground">
              {attachment.originalFileName} · PDF ·{" "}
              {attachment.byteSize >= 1024 * 1024
                ? (attachment.byteSize / 1024 / 1024).toFixed(1) + " MB"
                : Math.ceil(attachment.byteSize / 1024) + " KB"}
            </p>
          </div>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
            href={attachment.href}
            download
          >
            PDF 내려받기
          </a>
        </div>
      ) : (
        <p className="mt-2 text-small text-muted-foreground">첨부파일이 없습니다.</p>
      )}
    </section>
  );
}
