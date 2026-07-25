const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly, such as your name, email, profile details, and content you post in the community.",
  },
  {
    title: "2. How We Use Information",
    body: "We use your information to provide and improve the platform, personalize your experience, communicate product updates, and protect the service from abuse.",
  },
  {
    title: "3. Sharing and Disclosure",
    body: "We may share data with trusted service providers that support operations such as hosting, analytics, and messaging. We do not sell personal data.",
  },
  {
    title: "4. Data Retention",
    body: "We retain data for as long as required to provide services, maintain security, meet contractual obligations, and comply with applicable law.",
  },
  {
    title: "5. Security",
    body: "We apply administrative, technical, and organizational safeguards to protect personal data, though no method of storage or transmission is absolutely secure.",
  },
  {
    title: "6. Your Choices",
    body: "You can update profile information, manage communication preferences, and request account deletion where supported by law and platform policy.",
  },
  {
    title: "7. Children’s Privacy",
    body: "Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.",
  },
  {
    title: "8. Policy Updates",
    body: "We may revise this policy from time to time. Material updates will be communicated through the platform or by email where appropriate.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="rounded-[2rem] border border-stone-800 bg-gradient-to-r from-[#F839A9]/20 via-stone-900 to-stone-950 p-8 shadow-2xl lg:p-12">
          <p className="text-xs uppercase tracking-[0.35em] text-[#80c8ff]">Privacy Policy</p>
          <h1 className="mt-4 text-4xl font-semibold lg:text-5xl">Your data, handled with care.</h1>
          <p className="mt-4 text-sm text-stone-300">Last updated: September 14, 2025</p>
          <p className="mt-5 max-w-3xl text-base text-stone-300 lg:text-lg">
            This policy explains what information we collect, how it is used, and the controls available to you when using World. New.
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
          <h3 className="text-xl font-semibold">Contact</h3>
          <p className="mt-3 text-sm text-stone-300">
            Questions about this policy can be sent to{" "}
            <a href="mailto:support@worldnew.love" className="text-[#F839A9] underline">
              support@worldnew.love
            </a>
            .
          </p>
        </article>
      </section>
    </main>
  );
}
