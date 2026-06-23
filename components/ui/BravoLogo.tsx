import Image from "next/image";

export default function BravoLogo({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-[16px] border border-accent-blue/20 bg-[linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] shadow-[0_0_28px_rgba(20,126,245,0.16)]"
      style={{ width: size, height: size }}
    >
      <Image src="/images/bravo-logo.svg" alt="Bravo Gaming" width={size - 10} height={size - 10} />
    </div>
  );
}
