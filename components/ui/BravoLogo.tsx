import Image from "next/image";

export default function BravoLogo({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-card border border-accent-blue/25 bg-bg-card shadow-glow"
      style={{ width: size, height: size }}
    >
      <Image src="/images/bravo-logo.svg" alt="Bravo Gaming" width={size - 10} height={size - 10} />
    </div>
  );
}
