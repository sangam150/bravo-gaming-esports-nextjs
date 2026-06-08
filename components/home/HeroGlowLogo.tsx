export default function HeroGlowLogo() {
  return (
    <div className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 select-none opacity-30 lg:opacity-50" aria-hidden>
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-bravoBlue/40 scale-150" />
        <span className="relative block text-[12rem] font-black leading-none text-transparent bg-gradient-to-b from-bravoBlue/60 to-bravoBlue/10 bg-clip-text lg:text-[16rem]">
          B
        </span>
      </div>
    </div>
  );
}
