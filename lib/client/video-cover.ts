/**
 * Client-side helpers to capture a low-size WebP cover from a video file.
 * Used when the user uploads a video without providing a custom cover.
 */

const COVER_SEEK_SECONDS = 3;
const COVER_MAX_WIDTH = 720;
const COVER_WEBP_QUALITY = 0.72;

function loadVideoFromFile(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      resolve(video);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("بارگذاری ویدیو برای ساخت کاور ناموفق بود"));
    };

    // Attach cleanup handle for callers
    (video as HTMLVideoElement & { __revoke?: () => void }).__revoke = cleanup;
  });
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target =
      duration > 0 ? Math.min(Math.max(timeSec, 0), Math.max(duration - 0.05, 0)) : timeSec;

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("جابه‌جایی به ثانیه کاور ناموفق بود"));
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    try {
      video.currentTime = target;
    } catch {
      onError();
    }
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("ساخت تصویر WebP ناموفق بود"));
      },
      "image/webp",
      quality
    );
  });
}

/** Capture a frame near second 3 and encode as a compact WebP blob. */
export async function captureVideoCoverWebp(
  file: File,
  seekSeconds = COVER_SEEK_SECONDS
): Promise<Blob> {
  const video = await loadVideoFromFile(file);
  const revoke = (video as HTMLVideoElement & { __revoke?: () => void }).__revoke;

  try {
    await seekVideo(video, seekSeconds);

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const scale = Math.min(1, COVER_MAX_WIDTH / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas در دسترس نیست");
    }

    context.drawImage(video, 0, 0, width, height);
    return await canvasToWebpBlob(canvas, COVER_WEBP_QUALITY);
  } finally {
    revoke?.();
  }
}

async function uploadImageBlob(blob: Blob, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("kind", "image");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "آپلود کاور ویدیو ناموفق بود");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

/**
 * Capture a WebP cover from the video file and upload it.
 * Returns the public cover URL.
 */
export async function captureAndUploadVideoCover(
  file: File,
  seekSeconds = COVER_SEEK_SECONDS
): Promise<string> {
  const blob = await captureVideoCoverWebp(file, seekSeconds);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
  return uploadImageBlob(blob, `${baseName}-cover.webp`);
}
