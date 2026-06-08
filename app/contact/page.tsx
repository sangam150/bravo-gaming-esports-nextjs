export default function ContactPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="mb-8">
          <p className="section-title">Contact</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Get in Touch</h1>
          <p className="mt-5 max-w-2xl text-slate-300">Questions about registration, sponsorship, streaming or admin support? Reach out and we’ll respond swiftly.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Contact Details</p>
            <div className="mt-6 space-y-4 text-slate-300">
              <p><span className="font-semibold text-white">Email:</span> hello@bravogamingesports.com</p>
              <p><span className="font-semibold text-white">Discord:</span> kamaucha.me/bravo</p>
              <p><span className="font-semibold text-white">YouTube:</span> bravogamingnepal7981</p>
            </div>
          </div>
          <form className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <input className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-bravoBlue" placeholder="Your Name" />
            <input className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-bravoBlue" placeholder="Email Address" />
            <textarea className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-bravoBlue" rows={5} placeholder="Message" />
            <button type="button" className="w-full rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Send Message</button>
          </form>
        </div>
      </section>
    </main>
  );
}
