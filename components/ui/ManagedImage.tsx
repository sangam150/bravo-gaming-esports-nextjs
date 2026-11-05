"use client";

import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import Image from "next/image";
import { useState } from "react";

type ManagedImageProps = {
  src: string;
  alt: string;
  wrapperClassName?: string;
  className?: string;
  fallbackText?: string;
  sizes?: string;
  priority?: boolean;
};

function shouldDisableOptimization(src: string) {
  const normalizedSrc = src.trim().toLowerCase();
  return normalizedSrc.endsWith(".svg") || normalizedSrc.startsWith("data:") || normalizedSrc.startsWith("blob:");
}

export default function ManagedImage({
  src,
  alt,
  wrapperClassName,
  className,
  fallbackText,
  sizes = "100vw",
  priority = false,
}: ManagedImageProps) {
  const resolvedSrc = resolvePublicAssetUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !resolvedSrc || failedSrc === resolvedSrc;

  return (
    <div
      className={wrapperClassName ? `relative overflow-hidden ${wrapperClassName}` : "relative overflow-hidden"}
      data-managed-image=""
      data-image-failed={failed ? "true" : undefined}
    >
      {failed ? (
        <span
          aria-hidden={alt ? undefined : true}
          aria-label={alt || undefined}
          role="img"
          className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(47,152,255,0.28),rgba(8,80,178,0.38))] text-center font-display text-[0.72em] font-extrabold uppercase tracking-[0.08em] text-white"
        >
          {fallbackText?.trim() || "Image unavailable"}
        </span>
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={shouldDisableOptimization(resolvedSrc)}
          className={className}
          onError={() => setFailedSrc(resolvedSrc)}
        />
      )}
    </div>
  );
}
