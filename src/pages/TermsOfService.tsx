import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last Updated: December 26, 2024</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Ajo Secure ("the Service"), you accept and agree to be bound by the terms and
                provisions of this agreement. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
              <p>
                Ajo Secure is an automated escrow-based rotating savings and credit association (ROSCA) platform. The
                Service acts as an organizer, holding contributions securely, enforcing mandatory security deposits,
                applying penalties for defaults, and automatically releasing payouts according to a predefined rotation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Eligibility</h2>
              <p>To use the Service, you must:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Account Registration and Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all
                activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Not share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Financial Terms</h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Service Fees</h3>
              <p>Ajo Secure charges a 10% service fee per contribution cycle.</p>

              <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Security Deposits</h3>
              <p>
                All group members are required to pay a security deposit as specified during group creation. This
                deposit is held in escrow and may be forfeited in cases of default.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">5.3 Contributions</h3>
              <p>
                Members must make contributions according to the agreed schedule. Late or missed payments may incur
                penalties as outlined in the group rules.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">5.4 Payouts</h3>
              <p>
                Payouts are automatically released when all members have paid their contributions for the current cycle.
                The payout recipient is determined by the predefined rotation order.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Penalties and Defaults</h2>
              <p>
                Late payments may incur penalties as specified in the group rules. Members who repeatedly default or
                miss payments may:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Forfeit their security deposit</li>
                <li>Be removed from the group</li>
                <li>Be restricted from joining future groups</li>
                <li>Face additional penalties as outlined in group rules</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Prohibited Activities</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to defraud other users or the platform</li>
                <li>Create multiple accounts to manipulate the system</li>
                <li>Use automated tools or bots to interact with the Service</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p>
                Ajo Secure acts as a platform facilitator and is not responsible for the actions of individual users.
                We are not liable for:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Member defaults or non-payment</li>
                <li>Payment processing delays by third-party providers</li>
                <li>Loss of funds due to user error or misconduct</li>
                <li>Service interruptions or technical issues</li>
                <li>Indirect, incidental, or consequential damages</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Dispute Resolution</h2>
              <p>
                Disputes between members should first be resolved within the group. If resolution cannot be achieved,
                parties may contact our support team. We reserve the right to make final decisions on disputes based on
                available evidence and platform rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to
                understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. Changes will be effective
                immediately upon posting. Continued use of the Service after changes constitutes acceptance of the
                modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation of these terms or
                for any other reason at our discretion. Upon termination:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your access to the Service will be revoked</li>
                <li>Outstanding obligations must still be fulfilled</li>
                <li>Earned payouts will be processed according to schedule</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Governing Law</h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of the Federal
                Republic of Nigeria, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Contact Information</h2>
              <p>For questions about these Terms of Service, please contact us at:</p>
              <ul className="mt-2 space-y-1">
                <li>Email: legal@ajosecure.com</li>
                <li>Support: support@ajosecure.com</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-gray-600">
              By using Ajo Secure, you acknowledge that you have read, understood, and agree to be bound by these Terms
              of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
