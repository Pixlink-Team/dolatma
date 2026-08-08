"use client";

type EvidenceGalleryProps = {
  images: string[];
  extraCount?: number;
};

export function EvidenceGallery({
  images,
  extraCount = 0,
}: EvidenceGalleryProps) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
    >
      {images.slice(0, 3).map((src, index) => (
        <div
          key={src}
          className="relative h-[76px] overflow-hidden rounded-lg"
          style={{ border: "1px solid #25314A" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
          {index === 2 && extraCount > 0 ? (
            <>
              <div className="absolute inset-0 bg-black/55" />
              <span
                className="absolute top-1.5 left-1.5 rounded-full px-2 py-1 text-[12px] text-white"
                style={{ background: "rgba(7, 12, 23, 0.82)" }}
              >
                +{extraCount}
              </span>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
