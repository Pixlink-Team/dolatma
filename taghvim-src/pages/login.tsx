"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { IranEmblem } from "@taghvim/components/brand/IranEmblem";
import { getSiteBranding, SITE_TAGLINE, SITE_TITLE } from "@taghvim/lib/branding";
import { canViewAdminViews, loginRequest } from "@taghvim/lib/auth";
import { getSession } from "@taghvim/lib/admin-store";
import { applyTheme, getStoredTheme } from "@taghvim/lib/theme";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

type Pointer = { x: number; y: number };

const CENTER: Pointer = { x: 0.5, y: 0.5 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function LoginPage() {
  const router = useRouter();
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef<Pointer>(CENTER);
  const smoothRef = useRef<Pointer>({ ...CENTER });
  const [pointer, setPointer] = useState<Pointer>(CENTER);
  const [isHovering, setIsHovering] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    siteTitle: SITE_TITLE,
    siteTagline: SITE_TAGLINE,
  });

  const tick = useCallback(() => {
    const target = targetRef.current;
    const smooth = smoothRef.current;

    smooth.x = lerp(smooth.x, target.x, 0.1);
    smooth.y = lerp(smooth.y, target.y, 0.1);

    setPointer({ x: smooth.x, y: smooth.y });
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    applyTheme("dark");
    return () => {
      applyTheme(getStoredTheme());
    };
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [tick]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const updateInset = () => {
      const next = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(next > 72 ? next : 0);
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
    };
  }, []);

  useEffect(() => {
    const b = getSiteBranding();
    setBranding({ siteTitle: b.siteTitle, siteTagline: b.siteTagline });
    const session = getSession();
    if (session) {
      router.replace(
        canViewAdminViews(session.user) ? taghvimPath("/timeline") : taghvimPath("/my-content"),
      );
    }
  }, [router]);

  function handlePointerMove(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    targetRef.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    setIsHovering(true);
  }

  function handlePointerLeave() {
    targetRef.current = CENTER;
    setIsHovering(false);
  }

  const tiltX = (pointer.y - 0.5) * -10;
  const tiltY = (pointer.x - 0.5) * 10;
  const bgShiftX = (pointer.x - 0.5) * 28;
  const bgShiftY = (pointer.y - 0.5) * 28;
  const glareX = pointer.x * 100;
  const glareY = pointer.y * 100;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await loginRequest(username, password);
      router.replace(
        canViewAdminViews(session.user) ? taghvimPath("/timeline") : taghvimPath("/my-content"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="login-page relative isolate flex h-dvh items-center justify-center overflow-hidden px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:py-10"
      style={{ direction: "rtl" }}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      <div
        aria-hidden
        className="login-bg-parallax absolute inset-[-4%] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/login-bg.webp)",
          filter: "saturate(1.12)",
          transform: `translate3d(${bgShiftX}px, ${bgShiftY}px, 0) scale(1.02)`,
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.12)_100%)]"
      />

      <div
        className="login-parallax relative w-full max-w-[460px]"
        style={{
          transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transition: isHovering
            ? "transform 0.08s ease-out"
            : "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          marginBottom: keyboardInset ? `${Math.min(keyboardInset, 320)}px` : undefined,
        }}
      >
        <div
          className="relative overflow-hidden rounded-[32px] border border-white/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-8"
          style={{
            background: "rgba(255, 255, 255, 0.024)",
            WebkitBackdropFilter: "blur(5px) saturate(155%) brightness(1.04)",
            backdropFilter: "blur(5px) saturate(155%) brightness(1.04)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[32px]"
            style={{
              background: `radial-gradient(460px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 30%, transparent 58%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          <div className="relative mb-8 flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
              style={{
                background: "rgba(255, 255, 255, 0.022)",
                WebkitBackdropFilter: "blur(3px) saturate(145%)",
                backdropFilter: "blur(3px) saturate(145%)",
              }}
            >
              <IranEmblem className="h-8 w-8 text-white/95 drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/65 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                ورود به سامانه
              </p>
              <h1 className="mt-1 text-[1.2rem] font-semibold leading-8 tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                {branding.siteTitle}
              </h1>
              <p className="mt-1 text-sm leading-7 text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
                {branding.siteTagline}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="relative space-y-5">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">نام کاربری</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                type="text"
                autoComplete="username"
                placeholder="نام کاربری خود را وارد کنید"
                className="mobile-input w-full rounded-2xl border border-white/35 px-4 py-3.5 text-white placeholder:text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/25"
                style={{
                  background: "rgba(255, 255, 255, 0.018)",
                  WebkitBackdropFilter: "blur(2.5px)",
                  backdropFilter: "blur(2.5px)",
                }}
                required
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">رمز عبور</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                type="password"
                autoComplete="current-password"
                placeholder="رمز عبور"
                className="mobile-input w-full rounded-2xl border border-white/35 px-4 py-3.5 text-white placeholder:text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/25"
                style={{
                  background: "rgba(255, 255, 255, 0.018)",
                  WebkitBackdropFilter: "blur(2.5px)",
                  backdropFilter: "blur(2.5px)",
                }}
                required
              />
            </label>

            {error ? (
              <p
                className="rounded-2xl border border-red-200/30 px-4 py-2.5 text-sm text-red-50 [text-shadow:0_1px_6px_rgba(0,0,0,0.4)] [background:rgba(220,38,38,0.12)] [backdrop-filter:blur(2px)]"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-[#0A84FF]/90 py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(10,132,255,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-[2px] transition hover:bg-[#0077ED] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/60 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
          سامانه مدیریت تقویم دفاع ملی
        </p>
      </div>
    </main>
  );
}
