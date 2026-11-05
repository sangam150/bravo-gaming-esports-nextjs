"use client";
import Image from "next/image";
import { useState } from "react";
export default function BroadcastAsset({ url, name }: { url?: string; name: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  return url && failedUrl !== url ? (
    <Image
      key={url}
      src={url}
      alt={name}
      width={600}
      height={600}
      unoptimized
      className="broadcast-asset"
      onError={() => setFailedUrl(url)}
    />
  ) : (
    <span className="broadcast-monogram" aria-label={`${name}: image unavailable`}>
      <Image src="/images/bravo-logo-mark.webp" alt="" width={120} height={120} unoptimized />
      <span>{name.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}
