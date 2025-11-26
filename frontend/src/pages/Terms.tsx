import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/AuthHeader";

const Terms = () => {
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
          <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
          
          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms & Conditions ("Terms") govern the purchase, issuance, use, redemption, cancellation, refund, and expiry of SabbPe Gift Vouchers ("Vouchers"). The Vouchers are issued by: <strong>One78 SabbPe Technology Solutions India Private Limited</strong> ("SabbPe", "Company", "We", "Us", "Our") Registered in India under the Companies Act, 2013. By purchasing or using a SabbPe Gift Voucher, you ("User", "Customer", "Holder", "Recipient") agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Nature of the Voucher</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                SabbPe Gift Vouchers are prepaid instruments, redeemable only for products/services listed on the SabbPe platform or approved partner platforms.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Vouchers do not carry any interest.</li>
                <li>Vouchers are not legal tender, not transferable for cash, and not reloadable unless explicitly stated.</li>
                <li>Vouchers cannot be redeemed for cash except where mandated under RBI or applicable law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Eligibility</h2>
              <p className="text-gray-700 leading-relaxed mb-2">You must:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Be at least 18 years old,</li>
                <li>Have a valid Indian mobile number or email,</li>
                <li>Be legally capable of entering into a contract under the Indian Contract Act, 1872.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">
                Corporate customers may purchase vouchers under a separate agreement via Group Booking or corporate Booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Issuance of Vouchers</h2>
              <p className="text-gray-700 leading-relaxed mb-2">A voucher may be issued:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Digitally via SMS, email, or in-app delivery.</li>
                <li>Physically, if applicable (cards, print vouchers).</li>
                <li>With a unique Voucher Code and/or PIN.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">SabbPe is not responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>The purchaser entered an incorrect email or mobile number.</li>
                <li>Delivery delays caused by technical issues or user error.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Validity Period</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>All vouchers have a minimum 1-year validity from the date of issuance (as per RBI PPI norms).</li>
                <li>Expiry date will be explicitly mentioned.</li>
                <li>SabbPe is not obligated to revalidate expired vouchers unless required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Redemption Conditions</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                Vouchers can be redeemed only against eligible goods/services listed on the SabbPe platform. Redemption may require entering:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Voucher Code,</li>
                <li>PIN/OTP,</li>
                <li>Registered mobile number.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4"><strong>Partial Redemption:</strong> If allowed, any unused balance remains available until the expiry date.</p>
              <p className="text-gray-700 leading-relaxed mt-4"><strong>Combined Use:</strong> Vouchers may or may not be combined with promotions, discounts, or other vouchers—subject to product-specific rules.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Non-Transferability</h2>
              <p className="text-gray-700 leading-relaxed mb-2">Vouchers cannot be:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Resold,</li>
                <li>Transferred (unless explicitly allowed),</li>
                <li>Bartered,</li>
                <li>Converted to cash or credit.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Unauthorised resale or trading will void the voucher.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Lost, Stolen, or Misused Vouchers</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>SabbPe is not liable for vouchers lost, stolen, or used without your permission.</li>
                <li>Once a voucher is delivered, safeguarding it is the customer's responsibility.</li>
                <li>Replacement may be offered only if: Voucher is unused, Proof of purchase is provided, Company verification is successful.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Fraud, Abuse & Suspicious Activity</h2>
              <p className="text-gray-700 leading-relaxed mb-2">SabbPe may block or cancel vouchers if:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Obtained fraudulently,</li>
                <li>Used to commit fraud or illegal transactions,</li>
                <li>Redeemed in suspicious patterns,</li>
                <li>Violating terms.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">We may report suspicious activity to authorities or partner banks.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Pricing, Taxes & Charges</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Voucher value includes applicable taxes unless otherwise specified.</li>
                <li>Redemption of certain services/products may attract additional taxes or charges.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Cancellation by User</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Once issued/activated, vouchers generally cannot be cancelled.</li>
                <li>Pre-issuance cancellation may be allowed (see Refund Policy).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Cancellation by SabbPe</h2>
              <p className="text-gray-700 leading-relaxed mb-2">SabbPe may cancel a voucher due to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Fraudulent purchase,</li>
                <li>System error,</li>
                <li>Regulatory requirement,</li>
                <li>Misuse or violation of these terms.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Refund may be provided at SabbPe's discretion.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-2">SabbPe is not liable for:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Loss arising from voucher misuse,</li>
                <li>Inability to redeem due to technical or network issues,</li>
                <li>Merchant non-performance (where partner merchants participate),</li>
                <li>Loss of data or service interruption.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Our maximum liability is limited to the unredeemed face value of the voucher.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Governing Law & Jurisdiction</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by Indian law. Legal disputes shall be subject to courts having jurisdiction where SabbPe's registered office is located.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Updates to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                SabbPe may update these Terms at any time. Users will be notified via website updates or electronic communication.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;

