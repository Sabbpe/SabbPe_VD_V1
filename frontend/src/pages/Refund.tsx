import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/AuthHeader";

const Refund = () => {
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
          <h1 className="text-3xl font-bold mb-6">Refund & Cancellation Policy</h1>
          
          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. General Refund Principles</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Refunds are governed by RBI PPI rules and SabbPe internal policies.</li>
                <li>Refunds are provided only in exceptional cases.</li>
                <li>Once a voucher is issued/activated, a refund is generally not possible unless mandated by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Refund Eligibility Scenarios</h2>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">Refunds Allowed:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Duplicate payment for the same voucher</li>
                <li>Voucher not delivered due to technical issues</li>
                <li>Wrong value issued due to a system error</li>
                <li>Failed payment reversal (automatic refund)</li>
                <li>Fraudulent purchase reported within reasonable time</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">Refund Not Allowed:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Voucher already redeemed (fully or partially)</li>
                <li>User entered wrong email/mobile number</li>
                <li>User changed mind after purchase</li>
                <li>Voucher expired</li>
                <li>Voucher purchased through unauthorised reseller</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Cancellation Rules</h2>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">Before Issuance</h3>
              <p className="text-gray-700 leading-relaxed">
                Cancellation is allowed if the voucher has not been generated or delivered.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">After Issuance</h3>
              <p className="text-gray-700 leading-relaxed mb-2">No cancellation is allowed unless there is:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Technical malfunction</li>
                <li>Wrong value or voucher issued</li>
                <li>Regulatory/legal requirement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Refund Method</h2>
              <p className="text-gray-700 leading-relaxed mb-2">Refunds will be processed only to the original payment method, such as:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>UPI</li>
                <li>Credit/Debit card</li>
                <li>Net banking</li>
                <li>Wallet (if used)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">Cash refunds are not provided unless required by law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Refund Processing Timeline</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>SabbPe will initiate a refund within <strong>7–14 business days</strong> after approval.</li>
                <li>Banks/UPI networks may take additional processing time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Expired Voucher Refunds</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Generally not eligible for refund.</li>
                <li>In exceptional cases (e.g., medical emergencies, system issues), SabbPe may decide to refund or revalidate.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Fraud & Misuse Cases</h2>
              <p className="text-gray-700 leading-relaxed mb-2">If a voucher is:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Misused,</li>
                <li>Purchased with stolen payment instruments,</li>
                <li>Involved in fraudulent activities,</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">SabbPe may block, cancel, or refuse a refund.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Dispute Resolution</h2>
              <p className="text-gray-700 leading-relaxed mb-2">If a user has a dispute:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Email our support team at <a href="mailto:support@sabbpe.com" className="text-blue-600 hover:underline">support@sabbpe.com</a></li>
                <li>Support team will respond within 48–72 business hours</li>
                <li>If unresolved, escalate to DPO or grievance officer</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Liability Limitation</h2>
              <p className="text-gray-700 leading-relaxed">
                SabbPe's total liability is limited to the face value of the voucher that remains unredeemed.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Refund;

