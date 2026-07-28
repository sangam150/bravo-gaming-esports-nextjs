import Image from "next/image";

export default function BravoLogo({ size = 44 }: { size?: number }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
      <Image
        src="/images/bravo-logo-mark.webp"
        alt="Bravo Gaming Esports"
        fill
        sizes={`${size}px`}
        className="object-contain mix-blend-screen"
        priority={size >= 44}
      />
    </div>
  );
}
