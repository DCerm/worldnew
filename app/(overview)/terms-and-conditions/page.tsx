import Link from "next/link";

const sections = [
  {
    title: "1. Membership Access",
    body: "Free and paid memberships unlock different levels of access. Memberships are personal accounts and may not be transferred or shared.",
  },
  {
    title: "2. Payments and Renewals",
    body: "Paid memberships are billed according to selected plans and may renew automatically unless canceled before the next billing cycle.",
  },
  {
    title: "3. Community Conduct",
    body: "Members must avoid harassment, hate speech, spam, illegal activity, and content that violates rights or community standards.",
  },
  {
    title: "4. Content and Intellectual Property",
    body: "You retain ownership of content you submit, while granting a license for in-platform display. Platform music, visuals, and brand assets remain World. New. intellectual property.",
  },
  {
    title: "5. Suspension and Termination",
    body: "We may suspend or terminate accounts for policy violations, abuse, fraudulent activity, or behavior that threatens community safety.",
  },
  {
    title: "6. Service Availability",
    body: "Services are provided as-is. We may update, pause, or discontinue features and do not guarantee uninterrupted operation.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the fullest extent allowed by law, World. New. is not liable for indirect, incidental, or consequential damages related to platform use.",
  },
  {
    title: "8. Updates to Terms",
    body: "Terms may be revised over time. Continued use of the platform after changes means you accept the updated terms.",
  },
];

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="rounded-[2rem] border border-stone-800 bg-gradient-to-r from-[#F839A9]/20 via-stone-900 to-stone-950 p-8 shadow-2xl lg:p-12">
          <p className="text-xs uppercase tracking-[0.35em] text-[#80c8ff]">Terms and Conditions</p>
          <h1 className="mt-4 text-4xl font-semibold lg:text-5xl">Simple rules for a healthy community.</h1>
          <p className="mt-4 text-sm text-stone-300">Last updated: September 14, 2025</p>
          <p className="mt-5 max-w-3xl text-base text-stone-300 lg:text-lg">
            By using World. New., you agree to these terms. They help protect the community, the artist ecosystem, and member experience.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[1.5rem] border border-stone-800 bg-stone-900/80 p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <article className="rounded-[1.5rem] border border-stone-800 bg-stone-900 p-6">
          <h3 className="text-xl font-semibold">Related Policies</h3>
          <p className="mt-3 text-sm text-stone-300">
            Please review our{" "}
            <Link href="/privacy-policy" className="text-[#F839A9] underline">
              Privacy Policy
            </Link>
            {" "}for details on data handling and user rights.
          </p>
        </article>
      </section>
    </main>
  );
}
