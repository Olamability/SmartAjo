import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: December 26, 2024</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p>
                Ajo Secure ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains
                how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Personal Information</h3>
              <p>We collect the following personal information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Account Information:</strong> Full name, email address, phone number</li>
                <li><strong>Identity Verification:</strong> BVN (Bank Verification Number), date of birth, address</li>
                <li><strong>Financial Information:</strong> Bank account details, transaction history</li>
                <li><strong>Profile Information:</strong> Profile picture, preferences</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Location data (with your permission)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Third-Party Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Payment processor information</li>
                <li>Identity verification service data</li>
                <li>Credit bureau information (for risk assessment)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Providing and maintaining the Service</li>
                <li>Processing transactions and managing contributions</li>
                <li>Verifying your identity and preventing fraud</li>
                <li>Sending notifications about your account and transactions</li>
                <li>Improving our Service and user experience</li>
                <li>Complying with legal obligations</li>
                <li>Resolving disputes and enforcing agreements</li>
                <li>Marketing and promotional communications (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-2">4.1 With Other Users</h3>
              <p>
                Basic profile information (name, profile picture) may be shared with other members of your savings
                groups to facilitate trust and transparency.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">4.2 With Service Providers</h3>
              <p>We share information with third-party service providers who perform services on our behalf:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Payment processors (Paystack, Flutterwave)</li>
                <li>Identity verification services</li>
                <li>Email and SMS service providers</li>
                <li>Cloud hosting providers</li>
                <li>Analytics and monitoring services</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">4.3 Legal Requirements</h3>
              <p>We may disclose your information if required by law or in response to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Court orders or legal processes</li>
                <li>Government or regulatory requests</li>
                <li>Law enforcement inquiries</li>
                <li>Protection of our rights and safety</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">4.4 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of
                the transaction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and testing</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p className="mt-2">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we
                strive to protect your personal information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Access and Correction</h3>
              <p>You have the right to access and update your personal information through your account settings.</p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.2 Data Portability</h3>
              <p>You can request a copy of your personal data in a structured, machine-readable format.</p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Deletion</h3>
              <p>
                You can request deletion of your account and personal data, subject to legal retention requirements and
                outstanding financial obligations.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.4 Marketing Communications</h3>
              <p>You can opt out of marketing emails by clicking the unsubscribe link or updating your preferences.</p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.5 Cookies</h3>
              <p>
                You can control cookies through your browser settings. Note that disabling cookies may affect Service
                functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p>We retain your information for as long as necessary to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide the Service</li>
                <li>Comply with legal obligations (minimum 7 years for financial records)</li>
                <li>Resolve disputes</li>
                <li>Enforce our agreements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
              <p>
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal
                information from children. If you believe we have collected information from a child, please contact us
                immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence.
                We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Third-Party Links</h2>
              <p>
                Our Service may contain links to third-party websites. We are not responsible for the privacy practices
                of these websites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via
                email or through the Service. The "Last Updated" date will reflect the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. GDPR Compliance (For EU Users)</h2>
              <p>If you are in the European Economic Area (EEA), you have additional rights:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Right to be informed</li>
                <li>Right of access</li>
                <li>Right to rectification</li>
                <li>Right to erasure</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object</li>
                <li>Rights related to automated decision-making</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Contact Us</h2>
              <p>For questions about this Privacy Policy or to exercise your rights, contact us at:</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Email:</strong> privacy@ajosecure.com</li>
                <li><strong>Support:</strong> support@ajosecure.com</li>
                <li><strong>Address:</strong> [Your Business Address]</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Data Protection Officer</h2>
              <p>
                For data protection matters, you can contact our Data Protection Officer at: dpo@ajosecure.com
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-gray-600">
              By using Ajo Secure, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
