import ContactFormClient from "@/components/forms/ContactFormClient";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="mb-8">
          <p className="section-title">Contact</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Get in Touch</h1>
          <p className="mt-5 max-w-2xl text-slate-300">
            Questions about registration, sponsorship, streaming, or admin support? Reach out and the message will go
            straight into the Bravo admin inbox.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Contact Details</p>
            <div className="mt-6 space-y-4 text-slate-300">
              <p>
                <span className="font-semibold text-white">Email:</span> hello@bravogamingesports.com
              </p>
              <p>
                <span className="font-semibold text-white">Discord:</span> kamaucha.me/bravo
              </p>
              <p>
                <span className="font-semibold text-white">YouTube:</span> bravogamingnepal7981
              </p>
            </div>
          </div>
          <ContactFormClient
            kind="contact"
            title="Send a message"
            description="Use this form for partnerships, registration questions, platform issues, or support requests."
            submitLabel="Send Message"
          />
        </div>
      </section>
    </main>
  );
}
