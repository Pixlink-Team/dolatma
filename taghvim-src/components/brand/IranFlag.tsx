import type { ImgHTMLAttributes } from "react";

type IranFlagProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  title?: string;
};

/** Official Iranian flag asset (`public/flag-of-iran.svg`) */
export function IranFlag({
  title = "پرچم جمهوری اسلامی ایران",
  className = "h-6 w-9",
  ...props
}: IranFlagProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG brand asset
    <img
      src="/flag-of-iran.svg"
      alt={title}
      title={title}
      className={className}
      draggable={false}
      {...props}
    />
  );
}
