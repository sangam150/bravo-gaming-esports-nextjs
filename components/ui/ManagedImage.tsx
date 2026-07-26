import Image from "next/image";

type ManagedImageProps = {
  src: string;
  alt: string;
  wrapperClassName?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

function shouldDisableOptimization(src: string) {
  const normalizedSrc = src.trim().toLowerCase();
  return normalizedSrc.endsWith(".svg") || normalizedSrc.startsWith("data:") || normalizedSrc.startsWith("blob:");
}

export default function ManagedImage({ src, alt, wrapperClassName, className, sizes = "100vw", priority = false }: ManagedImageProps) {
  return (
    <div className={wrapperClassName ? `relative overflow-hidden ${wrapperClassName}` : "relative overflow-hidden"}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={shouldDisableOptimization(src)}
        className={className}
      />
    </div>
  );
}
