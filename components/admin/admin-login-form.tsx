"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loginAdminAction } from "@/lib/actions/auth-actions";
import { isSupabaseConfigured } from "@/lib/utils";
import { Loader2, Zap } from "lucide-react";

type LoginMotionState = {
  backgroundX: number;
  backgroundY: number;
  glareX: number;
  glareY: number;
  rotateX: number;
  rotateY: number;
};

type LoginSceneStyle = CSSProperties & {
  "--login-bg-x": string;
  "--login-bg-y": string;
};

const INITIAL_MOTION_STATE: LoginMotionState = {
  backgroundX: 0,
  backgroundY: 0,
  glareX: 50,
  glareY: 0,
  rotateX: 0,
  rotateY: 0,
};

const MAX_BACKGROUND_OFFSET = 28;
const MAX_CARD_ROTATION = 10;

function getBoundedMotion(value: number, max: number) {
  return Math.max(-max, Math.min(max, value));
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motion, setMotion] = useState<LoginMotionState>(INITIAL_MOTION_STATE);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    const syncMotionPreference = () => {
      setMotionEnabled(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setMotion(INITIAL_MOTION_STATE);
      }
    };

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  const handleScenePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!motionEnabled || event.pointerType !== "mouse") return;

    const viewportX = event.clientX / window.innerWidth - 0.5;
    const viewportY = event.clientY / window.innerHeight - 0.5;

    setMotion((current) => ({
      ...current,
      backgroundX: getBoundedMotion(viewportX * MAX_BACKGROUND_OFFSET * 2, MAX_BACKGROUND_OFFSET),
      backgroundY: getBoundedMotion(viewportY * MAX_BACKGROUND_OFFSET * 2, MAX_BACKGROUND_OFFSET),
    }));
  };

  const handleCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!motionEnabled || event.pointerType !== "mouse") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    const rotateY = (relativeX - 0.5) * MAX_CARD_ROTATION * 2;
    const rotateX = -(relativeY - 0.5) * MAX_CARD_ROTATION * 2;

    setMotion((current) => ({
      ...current,
      glareX: relativeX * 100,
      glareY: relativeY * 100,
      rotateX: getBoundedMotion(rotateX, MAX_CARD_ROTATION),
      rotateY: getBoundedMotion(rotateY, MAX_CARD_ROTATION),
    }));
  };

  const resetCardMotion = () => {
    setMotion((current) => ({
      ...current,
      glareX: INITIAL_MOTION_STATE.glareX,
      glareY: INITIAL_MOTION_STATE.glareY,
      rotateX: INITIAL_MOTION_STATE.rotateX,
      rotateY: INITIAL_MOTION_STATE.rotateY,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase not configured");

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        window.location.assign("/admin");
        return;
      }

      await loginAdminAction(email, password);
    } catch (err) {
      if (isNextRedirectError(err)) return;
      const nextErrorMessage = err instanceof Error ? err.message : "خطا در ورود";
      setErrorMessage(nextErrorMessage);
      toast.error(nextErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sceneStyle: LoginSceneStyle = {
    "--login-bg-x": `${motion.backgroundX}px`,
    "--login-bg-y": `${motion.backgroundY}px`,
  };

  return (
    <main
      className="dark relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-white"
      dir="rtl"
      style={sceneStyle}
      onPointerMove={handleScenePointerMove}
    >
      <div
        className="pointer-events-none absolute -inset-8 -z-30 scale-105 bg-cover bg-center saturate-[1.18] transition-transform duration-300 ease-out motion-reduce:transform-none"
        style={{
          backgroundImage: "url('/images/login-bg.png')",
          transform: "translate3d(var(--login-bg-x), var(--login-bg-y), 0)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-black/35 via-slate-950/24 to-black/78" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.18)_42%,rgba(0,0,0,0.76)_100%)]" />

      <div className="w-full max-w-[460px]">
        <section
          className="group relative overflow-hidden rounded-[32px] border border-white/20 bg-white/[0.02] p-6 shadow-[0_32px_90px_rgba(0,0,0,0.58)] backdrop-blur-3xl backdrop-saturate-200 transition-transform duration-200 ease-out [transform-style:preserve-3d] md:p-7"
          style={{
            transform: motionEnabled
              ? `perspective(1000px) rotateX(${motion.rotateX}deg) rotateY(${motion.rotateY}deg)`
              : undefined,
          }}
          onPointerMove={handleCardPointerMove}
          onPointerLeave={resetCardMotion}
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent" />
          <div
            className="pointer-events-none absolute -inset-16 opacity-0 mix-blend-screen transition-opacity duration-200 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at ${motion.glareX}% ${motion.glareY}%, rgba(255,255,255,0.32), rgba(255,255,255,0.12) 13%, transparent 34%)`,
            }}
          />

          <div className="relative">
            <header className="mb-8 flex items-center gap-4 [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-2xl">
                <Zap className="h-7 w-7 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.26)]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/68">ورود به سامانه</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">داشبورد گزارش زنده کمپین</h1>
                <p className="mt-1 text-sm text-white/72">مدیریت امن گزارش‌ها و محتوای کمپین</p>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.74)]"
                >
                  نام کاربری
                </Label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="نام کاربری خود را وارد کنید"
                  required
                  dir="ltr"
                  autoComplete="username"
                  className="h-[52px] w-full rounded-2xl border border-white/18 bg-white/[0.07] px-4 py-3 text-left text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none backdrop-blur-xl transition placeholder:text-white/38 focus:border-white/36 focus:bg-white/[0.1] focus:ring-4 focus:ring-[#0A84FF]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.74)]"
                >
                  رمز عبور
                </Label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="رمز عبور خود را وارد کنید"
                  autoComplete="current-password"
                  className="h-[52px] w-full rounded-2xl border border-white/18 bg-white/[0.07] px-4 py-3 text-right text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none backdrop-blur-xl transition placeholder:text-white/38 focus:border-white/36 focus:bg-white/[0.1] focus:ring-4 focus:ring-[#0A84FF]/20"
                />
              </div>

              {errorMessage ? (
                <p className="rounded-2xl border border-red-300/20 bg-red-500/14 px-4 py-3 text-sm text-red-50 shadow-[0_10px_30px_rgba(127,29,29,0.18)] backdrop-blur-xl [text-shadow:0_2px_10px_rgba(0,0,0,0.62)]">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] px-5 py-3 text-base font-bold text-white shadow-[0_16px_42px_rgba(10,132,255,0.38)] transition hover:bg-[#0077ED] focus:outline-none focus:ring-4 focus:ring-[#0A84FF]/32 disabled:cursor-not-allowed disabled:opacity-70 [text-shadow:0_2px_10px_rgba(0,0,0,0.36)]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  "ورود"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-white/58 [text-shadow:0_2px_14px_rgba(0,0,0,0.82)]">
              سامانه مدیریت گزارش زنده کمپین
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
