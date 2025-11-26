import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/AuthHeader";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Purpose</h2>
              <p className="text-gray-700 leading-relaxed">
                This Privacy Policy explains how SabbPe collects, uses, shares, stores, and protects information when you purchase or redeem a SabbPe Gift Voucher.
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">The policy complies with:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Digital Personal Data Protection (DPDP) Act, 2023</li>
                <li>Information Technology Act, 2000 & SPDI Rules</li>
                <li>RBI PPI Guidelines (for voucher/transaction data retention)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Data We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Name</li>
                <li>Mobile number</li>
                <li>Email address</li>
                <li>Billing/shipping address (if physical voucher)</li>
                <li>Payment method details</li>
                <li>KYC information (if applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">Voucher Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Voucher ID, value, issuance date</li>
                <li>Redemption logs</li>
                <li>Transaction metadata</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">Device & Technical Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>IP address</li>
                <li>Browser/device identifiers</li>
                <li>Cookies</li>
                <li>Usage analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Data</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Issue and deliver vouchers</li>
                <li>Verify identity and prevent fraud</li>
                <li>Process transactions and redemption</li>
                <li>Provide customer support</li>
                <li>Send updates, alerts, and promotional messages</li>
                <li>Improve our platform and security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Legal Basis for Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We process data based on:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Consent (email, SMS notifications, marketing)</li>
                <li>Contractual necessity (voucher issuance/redemption)</li>
                <li>Compliance with law (KYC, transaction logs)</li>
                <li>Legitimate business interests (fraud detection, analytics)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Sharing of Information</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We may share your data with:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Payment aggregators, banks, card networks</li>
                <li>Partner merchants (if redeemable externally)</li>
                <li>SMS/email service providers</li>
                <li>Regulatory bodies when required</li>
                <li>Law enforcement for fraud or illegal activity</li>
                <li>IT infrastructure/cloud service providers</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2"><strong>We do not sell personal data.</strong></p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Data Retention Period</h2>
              <p className="text-gray-700 leading-relaxed mb-2">As required by RBI PPI regulations:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Transaction logs & voucher activity must be retained for minimum <strong>10 years</strong>.</li>
                <li>Personal data is retained only as long as: Required for business use, Required by law, Necessary for tax, audit, or compliance purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Cookies & Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We use:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Essential cookies (login, security)</li>
                <li>Analytical cookies</li>
                <li>Functional cookies</li>
                <li>Marketing cookies (only with consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Data Security Measures</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We implement:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Encryption of sensitive data</li>
                <li>Secure storage systems</li>
                <li>Access control and authentication</li>
                <li>Regular audits</li>
                <li>Monitoring for fraud/suspicious activity</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Despite safeguards, no system is completely secure.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Your Rights (DPDP Act)</h2>
              <p className="text-gray-700 leading-relaxed mb-2">Users have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Access personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete personal data (where permitted)</li>
                <li>Withdraw consent</li>
                <li>Request grievance redressal</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Requests can be made to our Data Protection Officer (DPO).</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                We do not knowingly collect data from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Policy Updates</h2>
              <p className="text-gray-700 leading-relaxed">
                This Policy may be updated periodically. Last updated date will be shown at the top of the page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Contact Details</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>Data Protection Officer (DPO)</strong><br />
                One78 SabbPe Technology Solutions India Private Limited<br />
                Email: <a href="mailto:contact@sabbpe.com" className="text-blue-600 hover:underline">contact@sabbpe.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

