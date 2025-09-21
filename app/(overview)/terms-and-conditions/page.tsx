import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <>
      {/* TERMS & CONDITIONS */}
      <section className="px-5 lg:px-20p py-24 lg:py-100 rounded-xl">
        {/* Title */}
        <h1 className="text-25px lg:text-2xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-600 mb-6">Last updated: [Insert Date]</p>

        {/* Intro */}
        <p className="mb-6">
            Welcome to <span className="font-bold">World. New.</span> – an online
            community owned and operated by Franke. These Terms &amp; Conditions
            (“Terms”) set out the rules for using our website, community features,
            and membership services. By joining World. New., whether on a free or
            paid plan, you agree to these Terms.
        </p>

        {/* Sections */}
        <div className="space-y-8 text-gray-800 leading-relaxed">
            {/* Membership */}
            <div>
            <h2 className="font-bold text-xl mb-2">1. Membership</h2>
            <ul className="list-disc list-inside space-y-1">
                <li>
                <span className="font-bold">Free Membership:</span> Gives you
                access to selected community areas, updates, and content.
                </li>
                <li>
                <span className="font-bold">Paid Membership:</span> Unlocks
                additional benefits such as exclusive content, early access to
                music, special events, and other perks listed on the membership
                page.
                </li>
            </ul>
            <p className="mt-2">
                Memberships are personal to you and cannot be transferred or shared.
            </p>
            </div>

            {/* Payments */}
            <div>
            <h2 className="font-bold text-xl mb-2">2. Payments & Renewals</h2>
            <ul className="list-disc list-inside space-y-1">
                <li>
                Paid memberships are billed according to the plan you choose
                (monthly, yearly, or otherwise stated).
                </li>
                <li>All payments are non-refundable except where required by law.</li>
                <li>
                Memberships automatically renew unless you cancel before your next
                billing date.
                </li>
            </ul>
            </div>

            {/* Community Rules */}
            <div>
            <h2 className="font-bold text-xl mb-2">3. Community Rules</h2>
            <p>
                World. New. is built on respect and positivity. To keep it safe and
                enjoyable for everyone:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
                <li>No harassment, hate speech, spam, or illegal content.</li>
                <li>Respect the privacy of other members.</li>
                <li>Don’t upload or share anything you don’t have the rights to.</li>
                <li>
                The team may remove posts, comments, or accounts that break these
                rules.
                </li>
            </ul>
            </div>

            {/* Content & IP */}
            <div>
            <h2 className="font-bold text-xl mb-2">
                4. Content & Intellectual Property
            </h2>
            <ul className="list-disc list-inside space-y-1">
                <li>
                <span className="font-bold">Your Content:</span> You own the
                rights to anything you post, but by posting you grant World. New.
                a non-exclusive license to display and share it within the
                community.
                </li>
                <li>
                <span className="font-bold">World. New. Content:</span> All music,
                videos, artwork, and community materials provided by Franke or the
                team remain our intellectual property. You may enjoy them for
                personal use but cannot copy, sell, or distribute them without
                permission.
                </li>
            </ul>
            </div>

            {/* Termination */}
            <div>
            <h2 className="font-bold text-xl mb-2">5. Termination</h2>
            <p>We may suspend or terminate your membership if you:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Break these Terms,</li>
                <li>Misuse the platform, or</li>
                <li>Engage in harmful behavior towards the community.</li>
            </ul>
            <p className="mt-2">
                You may cancel your membership at any time through your account
                settings.
            </p>
            </div>

            {/* Disclaimers */}
            <div>
            <h2 className="font-bold text-xl mb-2">6. Disclaimers</h2>
            <ul className="list-disc list-inside space-y-1">
                <li>
                World. New. is provided “as is.” We do not guarantee uninterrupted
                service or error-free content.
                </li>
                <li>
                While we aim to create a safe community, we are not responsible
                for user-generated content.
                </li>
            </ul>
            </div>

            {/* Liability */}
            <div>
            <h2 className="font-bold text-xl mb-2">7. Limitation of Liability</h2>
            <p>
                To the maximum extent allowed by law, World. New. and its owners are
                not liable for any damages arising from your use of the community,
                including loss of data, revenue, or goodwill.
            </p>
            </div>

            {/* Privacy */}
            <div>
            <h2 className="font-bold text-xl mb-2">8. Privacy</h2>
            <p>
                Your information will be handled according to our{" "}
                <Link href="/privacy-policy" className="text-blue-600 underline">
                Privacy Policy
                </Link>
                . Please review it to understand how we collect, use, and protect
                your data.
            </p>
            </div>

            {/* Changes */}
            <div>
            <h2 className="font-bold text-xl mb-2">9. Changes to These Terms</h2>
            <p>
                We may update these Terms from time to time. If changes are
                significant, we’ll notify members by email or through the website.
                Continued use of World. New. after changes means you accept the
                updated Terms.
            </p>
            </div>

            {/* Contact */}
            <div>
            <h2 className="font-bold text-xl mb-2">10. Contact</h2>
            <p>
                For questions about these Terms, contact us at:{" "}
                <span className="font-bold">[Insert Contact Email]</span>
            </p>
            </div>
        </div>
        </section>

      {/* FOOTER */}
    </>
  );
}
