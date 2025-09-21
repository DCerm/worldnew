import Link from 'next/link';

export default function RefundPolicy() {
  return (
    <>
      {/*    REFUND & RETURN POLICY */}
      <div className="bg-greener py-10 -mt-20" />
      <section className="px-5 lg:px-20p py-24 lg:py-100 rounded-xl">
        <div>
          <h2 className="text-30px lg:text-2xl font-semibold capitalize text-blue">
            Refund &amp; Return Policy
          </h2>
          <p className="pb-8 lg:pb-12">Last Updated: 14th Sep 2025</p>

          <p className="font-normal">
            At <strong>FARMTRUST NETWORK</strong>, we strive to ensure that farmers and buyers
            have a seamless and trustworthy trading experience. This Refund &amp; Return Policy
            outlines the terms under which refunds and returns may be processed for
            transactions conducted through our platform.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">1. General Policy</h4>
          <p>
            Due to the perishable nature of farm produce, all sales are considered final once
            confirmed, except where produce is damaged, spoiled, or does not meet agreed
            specifications. Refunds and returns are handled on a case-by-case basis to ensure
            fairness to both farmers and buyers.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">2. Returns</h4>
          <p className="pb-2">A return may be requested if:</p>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">
              The produce delivered does not match the order placed (e.g., wrong type).
            </li>
            <li className="text-lg">The produce arrives in poor or unusable condition.</li>
          </ol>
          <p className="pt-3 pb-2 font-medium">Conditions for return:</p>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">The issue must be reported within 24 hours of delivery.</li>
            <li className="text-lg">
              Produce must be kept in its original packaging and stored properly until inspected.
            </li>
            <li className="text-lg">Supporting evidence (photos or videos) may be required.</li>
          </ol>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">3. Refunds</h4>
          <p className="pb-2">Refunds may be issued in the following situations:</p>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">Order cancellation before dispatch.</li>
            <li className="text-lg">
              Verified cases of damaged, spoiled, or incorrect produce delivered.
            </li>
            <li className="text-lg">Failed delivery due to aggregator or logistics error.</li>
          </ol>
          <p className="pt-3 pb-2 font-medium">Refund process:</p>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">
              Approved refunds will be processed within 7–14 business days via the original
              payment method or platform wallet.
            </li>
            <li className="text-lg">
              Refunds may be offered as credit for future transactions instead of cash
              reimbursement.
            </li>
            <li className="text-lg">
              Cash refunds may attract deductions (e.g., taxes or processing fees).
            </li>
          </ol>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">4. Exclusions</h4>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">The buyer fails to provide accurate delivery information.</li>
            <li className="text-lg">
              The produce was damaged due to improper handling or storage after delivery.
            </li>
            <li className="text-lg">
              Delays caused by factors beyond our control (e.g., weather, strikes, border
              restrictions).
            </li>
          </ol>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">5. Dispute Resolution</h4>
          <p>
            If disagreements arise regarding refunds or returns, <strong>FARMTRUST NETWORK</strong>{' '}
            will mediate between farmers and buyers to reach a fair resolution. Our decision will
            be based on evidence provided and platform policies.
          </p>

          {/* Disclaimer Section */}
          <h2 className="text-30px lg:text-2xl font-semibold capitalize text-blue pt-10">
            Disclaimer
          </h2>
          <p className="pb-8 lg:pb-12">Last Updated: 14th Sep 2025</p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">1. Nature of Produce</h4>
          <p>
            All farm produce aggregated and supplied through our platform is sourced directly
            from farmers and producers. As agricultural products are natural and perishable,
            variations in size, shape, color, and quality may occur and are considered normal.
            While we make every effort to ensure quality and compliance with agreed
            specifications, we cannot guarantee that all produce will be free from minor
            imperfections.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">2. No Guarantee of Availability</h4>
          <p>
            Produce availability depends on seasonal harvests, weather conditions, and market
            fluctuations. We do not guarantee uninterrupted availability of any specific item,
            quantity, or grade of produce.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">3. Third-Party Services</h4>
          <p>
            Our platform may rely on third-party providers for logistics, payments, or other
            services. We do not control and are not responsible for the reliability, quality, or
            outcomes of third-party services.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">4. Limitation of Liability</h4>
          <p>
            <strong>FARMTRUST NETWORK</strong> shall not be held liable for:
          </p>
          <ol className="list-decimal py-2.5 pl-5">
            <li className="text-lg">
              Spoilage or deterioration of produce due to delays beyond our reasonable control
              (e.g., weather, strikes, border closures).
            </li>
            <li className="text-lg">
              Losses or damages caused by misuse, improper storage, or handling of produce after
              delivery.
            </li>
            <li className="text-lg">
              Any indirect, incidental, or consequential damages resulting from the use of our
              platform or services.
            </li>
          </ol>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">5. Accuracy of Information</h4>
          <p>
            While we strive to keep all information on our platform accurate and up to date, we
            make no representations or warranties of any kind, express or implied, about the
            completeness, accuracy, reliability, or suitability of information provided.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">6. No Professional Advice</h4>
          <p>
            Any content provided on our platform (including blogs, guides, or resources) is for
            informational purposes only and should not be considered professional, financial, or
            legal advice. Users should seek independent advice before making business or
            financial decisions.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">7. Force Majeure</h4>
          <p>
            We are not responsible for delays, cancellations, or failures to deliver due to
            circumstances beyond our control, including but not limited to natural disasters,
            government restrictions, epidemics, or unforeseen supply chain disruptions.
          </p>

          <h4 className="text-25px lg:text-30px font-semibold pt-5">8. Contact Us</h4>
          <div className="mt-5 flex flex-col gap-5">
            <p>
              <strong>FARMTRUST NETWORK</strong>
            </p>
            <p>
              Email:{' '}
              <Link
                href="mailto:your@email.com"
                className="hover:underline hover:decoration-wavy underline-offset-8"
              >
                your@email.com
              </Link>
            </p>
            <p>
              Phone:{' '}
              <Link
                href="tel:+2349159800022"
                className="underline hover:decoration-wavy underline-offset-8"
              >
                +234 9159800022
              </Link>
            </p>
            <p>Address: 72, iwaya road, Sabo, Yaba, Lagos, Nigeria.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
    </>
  );
}