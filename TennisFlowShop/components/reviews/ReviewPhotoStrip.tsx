import Image from "next/image";

export default function ReviewPhotoStrip({
  photos,
  onOpen,
}: {
  photos: string[];
  onOpen: (index: number) => void;
}) {
  const visible = photos.slice(0, 4);
  return (
    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((src, index) => {
        const remaining = photos.length - 4;
        const showOverlay = index === 3 && remaining > 0;
        return (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => onOpen(index)}
            className="relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-control border border-border bg-muted transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bp-sm:h-24 bp-sm:w-24 motion-reduce:transition-none motion-reduce:hover:scale-100"
            aria-label={`후기 사진 ${index + 1} 크게 보기`}
          >
            <Image
              src={src || "/placeholder.svg"}
              alt={`후기 사진 ${index + 1}`}
              fill
              className="object-cover"
            />
            {showOverlay ? (
              <span className="absolute inset-0 grid place-items-center bg-overlay/60 text-ui-body font-semibold text-surface-inverse-foreground">
                +{remaining}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
