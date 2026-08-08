"use client";

type EventTagsProps = {
  tags: string[];
};

export function EventTags({ tags }: EventTagsProps) {
  return (
    <div className="flex flex-wrap gap-2" style={{ direction: "rtl" }}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full px-[15px] py-[5px] text-[11px]"
          style={{
            background: "rgba(85, 19, 33, 0.28)",
            border: "1px solid rgba(223, 54, 69, 0.58)",
            color: "#FF555D",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
