import type { SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Globe, Share2 } from "lucide-react";
import type { ReactNode } from "react";

const platformMeta: Record<
  SocialPlatform,
  { label: string; className: string; iconClassName?: string }
> = {
  instagram: {
    label: "اینستاگرام",
    className: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
  },
  telegram: {
    label: "تلگرام",
    className: "bg-[#229ED9] text-white",
  },
  x: {
    label: "ایکس",
    className: "bg-black text-white",
  },
  youtube: {
    label: "یوتیوب",
    className: "bg-[#FF0000] text-white",
  },
  aparat: {
    label: "آپارات",
    className: "bg-[#EA1D5D] text-white",
  },
  linkedin: {
    label: "لینکدین",
    className: "bg-[#0A66C2] text-white",
  },
  rubika: {
    label: "روبیکا",
    className: "bg-[#7B2FF7] text-white",
  },
  eitaa: {
    label: "ایتا",
    className: "bg-[#F58220] text-white",
  },
  soroush: {
    label: "سروش",
    className: "bg-[#0088CC] text-white",
  },
  bale: {
    label: "بله",
    className: "bg-[#00A651] text-white",
  },
  other: {
    label: "سایر",
    className: "bg-muted text-foreground",
  },
};

function IconSvg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("h-[55%] w-[55%]", className)}
    >
      {children}
    </svg>
  );
}

function PlatformBrandIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "instagram":
      return (
        <IconSvg>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </IconSvg>
      );
    case "telegram":
      return (
        <IconSvg>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </IconSvg>
      );
    case "x":
      return (
        <IconSvg>
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </IconSvg>
      );
    case "youtube":
      return (
        <IconSvg>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </IconSvg>
      );
    case "linkedin":
      return (
        <IconSvg>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </IconSvg>
      );
    case "aparat":
      return (
        <IconSvg>
          <path d="M12.001 0C5.373 0 0 5.373 0 12.001 0 18.628 5.373 24 12.001 24 18.628 24 24 18.628 24 12.001 24 5.373 18.628 0 12.001 0zm4.894 16.803c-.77.77-1.79 1.155-2.81 1.155H9.915c-1.02 0-2.04-.385-2.81-1.155-.77-.77-1.155-1.79-1.155-2.81V9.915c0-1.02.385-2.04 1.155-2.81.77-.77 1.79-1.155 2.81-1.155h4.17c1.02 0 2.04.385 2.81 1.155.77.77 1.155 1.79 1.155 2.81v4.078c0 1.02-.385 2.04-1.155 2.81zm-2.09-7.068l-3.69 2.265 3.69 2.265V9.735z" />
        </IconSvg>
      );
    case "rubika":
      return (
        <IconSvg>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 16.875h-2.7l-1.65-3.075H9.6v3.075H6.75V7.125h5.55c2.55 0 4.2 1.425 4.2 3.6 0 1.425-.75 2.55-1.95 3.075l2.7 3.075zM9.6 11.4h2.55c.975 0 1.575-.525 1.575-1.35S13.125 8.7 12.15 8.7H9.6V11.4z" />
        </IconSvg>
      );
    case "eitaa":
      return (
        <IconSvg>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.4 7.2-1.65 9.3c-.12.54-.45.675-.9.42l-2.55-1.875-1.23 1.185c-.135.135-.255.255-.525.255l.18-2.64 4.8-4.335c.21-.18-.045-.285-.33-.105l-5.94 3.735-2.55-.795c-.555-.18-.57-.555.12-.825l9.96-3.84c.465-.165.87.105.72.645z" />
        </IconSvg>
      );
    case "soroush":
      return (
        <IconSvg>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.3 8.1-1.95 9.15c-.15.675-.525.84-1.05.525l-2.925-2.16-1.41 1.365c-.15.15-.285.285-.585.285l.21-3.03 5.49-4.965c.24-.21-.045-.33-.375-.12l-6.78 4.275-2.925-.915c-.63-.195-.645-.63.135-.945l11.4-4.395c.525-.195.99.12.825.72z" />
        </IconSvg>
      );
    case "bale":
      return (
        <IconSvg>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.63 4.35 1.71 6.15L.54 22.71c-.15.36.24.75.63.63l4.71-1.26A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.52 8.79-6.09 7.2a.9.9 0 0 1-1.32.06l-3.24-3.24a.9.9 0 1 1 1.275-1.275l2.55 2.55 5.445-6.435a.9.9 0 1 1 1.38 1.14z" />
        </IconSvg>
      );
    case "other":
    default:
      return <Share2 className="h-[45%] w-[45%]" />;
  }
}

interface SocialPlatformIconProps {
  platform: SocialPlatform;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SocialPlatformIcon({ platform, className, size = "md" }: SocialPlatformIconProps) {
  const style = platformMeta[platform] ?? platformMeta.other;
  const sizeClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        sizeClass,
        style.className,
        className
      )}
      aria-hidden
    >
      <PlatformBrandIcon platform={platform in platformMeta ? platform : "other"} />
    </div>
  );
}

export function getSocialPlatformLabel(platform: SocialPlatform): string {
  return (platformMeta[platform] ?? platformMeta.other).label;
}

export function SocialPlatformFallbackIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
        className
      )}
    >
      <Globe className="h-4 w-4" />
    </div>
  );
}
