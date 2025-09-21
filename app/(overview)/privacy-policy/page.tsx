import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <>
      {/*    PRIVACY POLICY */}

      <section className=" mt-4 lg:mt-12 px-2.5 lg:px-20p py-6 lg:py-12">
    {/* Title */}
    <h1 className="text-25px lg:text-2xl font-bold mb-2">Privacy Policy</h1>
    <p className="text-sm text-gray-600 mb-6">Last Updated: 14th Sep 2025</p>

    {/* Intro */}
    <p className="mb-6">
      <span className="font-bold">WORLD. NEW.</span> is committed to protecting your privacy. 
      This privacy policy explains how we collect, use, and share information about you when 
      you use our software and services.
    </p>

    {/* Sections */}
    <div className="space-y-8 text-gray-800 leading-relaxed">
      <div>
        <h2 className="font-bold text-xl mb-2">1. Information We Collect</h2>
        <p>
          We collect information you provide to us, such as your name and email address, when you sign up 
          for our services. We also collect information about your use of our services, including the 
          groups you create and join, and the content you post. Please note that we do not collect payment 
          information, as this is done securely through Stripe.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, to communicate 
          with you, and to personalize your experience. We never sell any data to advertisers or government 
          officials, and we go above and beyond to keep your data safe. We also use the information to 
          prevent fraud and abuse, and to comply with legal obligations.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">3. How We Share Your Information</h2>
        <p>
          We may share your information with third-party service providers who perform services on our behalf, 
          such as payment processing and email marketing. We may also share your information with law 
          enforcement or government officials when we are legally required to do so.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">4. Your Choices</h2>
        <p>
          You can choose to limit the information you provide to us. You can also choose to disable cookies in 
          your browser settings, although this may affect your ability to use our services.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">5. Data Retention</h2>
        <p>
          We retain your information as long as necessary to provide our services, or as required by law. We may 
          also retain your information after you delete your account for legal, regulatory, or technical reasons.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">6. Data Security</h2>
        <p>
          We use top-of-the-line security measures to protect your information from unauthorized access, disclosure, 
          alteration, or destruction. We go above and beyond to keep your data safe and secure.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">7. Children’s Privacy</h2>
        <p>
          Our services are not intended for use by children under the age of 13, and we do not knowingly collect 
          personal information from children under 13. If we become aware that we have collected personal 
          information from a child under 13, we will take steps to delete the information as soon as possible.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">8. Group Leaders and Marketing</h2>
        <p>
          Please note that all Group leaders have full access to email and SMS information you sign up with and by 
          signing up you give them full consent to market to you. If you do not wish to receive marketing emails or 
          messages, you should not sign up for our services.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">9. Changes to this Policy</h2>
        <p>
          We may update this privacy policy from time to time. If we make any material changes, we will notify you 
          by email or by posting a notice on our website.
        </p>
      </div>

      <div>
        <h2 className="font-bold text-xl mb-2">10. Contact Us</h2>
        <p>
          If you have any questions or concerns about our privacy policy, please contact us at 
          <a href="mailto:support@grouped.com" className="text-blue-600 underline"> support@gworldnew.love</a>.
        </p>
      </div>
    </div>

    {/* Agreement Note */}
    <p className="mt-8 text-sm text-gray-600">
      By using World. New. whether it be creating or joining a group, you agree to this privacy policy.
    </p>
  </section>

      {/* FOOTER */}
    </>
  );
}
