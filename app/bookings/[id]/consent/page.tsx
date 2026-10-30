"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Printer, Download, ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { formatDateDMY } from "@/lib/date-utils";
import { extractPrivacyConsentData } from "@/lib/privacy-consent-template";

export default function ConsentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contracts/${id}?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load contract details");
        return res.json();
      })
      .then(async (data) => {
        const clientIdStr = data?.clientId ? (typeof data.clientId === "object" ? (data.clientId._id || data.clientId.id) : data.clientId) : null;
        if (clientIdStr && typeof clientIdStr === "string" && clientIdStr.length > 5) {
          try {
            const clientRes = await fetch(`/api/clients/${clientIdStr}?t=${Date.now()}`, { cache: "no-store" });
            if (clientRes.ok) {
              const fullClient = await clientRes.json();
              data.clientId = { ...(typeof data.clientId === "object" ? data.clientId : {}), ...fullClient };
            }
          } catch (cErr) {
            console.warn("Could not fetch fresh client:", cErr);
          }
        }
        setContract(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading consent data:", err);
        setError("Contract not found or unable to load details.");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-9 h-9 animate-spin text-brand mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading Privacy Notice &amp; Consent document...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <p className="text-sm font-semibold text-rose-600 mb-3">{error || "Contract not found"}</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition-all cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const data = extractPrivacyConsentData(contract);
  const {
    clientName,
    clientIdNumber,
    clientAddress,
    clientEmail,
    clientPhone,
    contractDate,
    customerSignature,
    envelopeId,
  } = data;

  return (
    <div className="min-h-screen bg-neutral-200 text-black py-4 sm:py-8 print:py-0 print:bg-white">
      {/* Top action toolbar - hidden when printing */}
      <div className="max-w-[820px] mx-auto px-4 mb-4 flex items-center justify-between gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Printer size={14} />
            <span>Print Document</span>
          </button>
          <a
            href={`/api/contracts/${id}/consent-pdf?download=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Main A4 Document Paper */}
      <div 
        id="consent-page"
        className="max-w-[794px] mx-auto bg-white p-8 sm:p-12 shadow-xl print:shadow-none print:p-0 print:max-w-none text-black font-sans leading-tight text-[13px]"
        style={{ minHeight: "1123px" }}
      >
        {/* Envelope ID */}
        <div className="text-[10px] text-gray-500 font-mono mb-2">
          DocuSign Envelope ID: {envelopeId}
        </div>

        {/* Cardoo Logo */}
        <div className="mb-3">
          <span className="text-[34px] font-extrabold tracking-[-2px] text-black leading-none inline-block font-sans">
            cardoo
          </span>
        </div>

        {/* Document Title */}
        <h1 className="text-center font-bold text-[15px] uppercase tracking-wide my-4 text-black">
          PRIVACY NOTICE AND CONSENT
        </h1>

        {/* Date Row */}
        <div className="text-right text-[12.5px] mb-3">
          <span>Date </span>
          <span className="inline-block border-b border-black min-w-[100px] text-center font-semibold pb-0.5">
            {contractDate || "________________"}
          </span>
        </div>

        {/* Section 1: The Client */}
        <div className="text-[12.5px] mb-1.5">
          1.&nbsp;&nbsp;&nbsp;&nbsp;The Client
        </div>

        {/* Client Details Table */}
        <table className="w-full border-collapse border-[1.5px] border-black mb-3 text-[12px]">
          <tbody>
            <tr>
              <td className="w-[30%] border border-black px-2.5 py-1.5 font-normal">Full name</td>
              <td className="w-[70%] border border-black px-2.5 py-1.5 font-bold">{clientName}</td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1.5 font-normal">Passport / ID number</td>
              <td className="border border-black px-2.5 py-1.5 font-bold">{clientIdNumber}</td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1.5 font-normal">Residential address</td>
              <td className="border border-black px-2.5 py-1.5 font-bold">{clientAddress}</td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1.5 font-normal">E-mail</td>
              <td className="border border-black px-2.5 py-1.5 font-bold">{clientEmail}</td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1.5 font-normal">Phone number</td>
              <td className="border border-black px-2.5 py-1.5 font-bold">
                {clientPhone ? (clientPhone.startsWith("+") ? clientPhone : `+${clientPhone}`) : ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Legal Clauses Text */}
        <div className="space-y-2 text-[11px] leading-[1.35] text-justify text-black">
          <p>
            herewith is informed by the Lessor <strong>Leon Car Rental L.L.C</strong> ,registration number <strong>1029208</strong>, (UAE) that the Lessor will collect, store, and use the Client&rsquo;s personal data disclosed with respect to the Rental Agreement according to their legitimate interest, including: full name, telephone number, e-mail address, residential address, passport details such as number, issue and expiry dates, issuing body, date of birth, gender and other details specified in the Client&rsquo;s personal identification document (referred to as the Personal Data).
          </p>

          <p>
            2.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor will disclose the Client&rsquo;s Personal Data to their partner company, Cardoo Cyprus Ltd, registry code HE434654, Sotiri Michailidi &amp; 28 Oktovriou, LOPHITIS INTERNATIONAL CENTRE, 7th floor, 3035 Limassol, Cyprus, email: privacy@cardooworld.com (referred to as the Partner), and other third parties, as the case may be, according to their legitimate interest for the following purposes:
          </p>
          <p className="pl-6">
            2.1. To perform as a guarantor for the Client&rsquo;s liabilities in favor of the Lessor;
          </p>
          <p className="pl-6">
            2.2. To arrange for the subsequent transfer of the Personal Data to a collection agent, either directly or via the Partner, as and when the Client may not pay their due under the Rental Agreement;
          </p>
          <p className="pl-6">
            2.3. To transfer to a credit reference agency details on the Client&rsquo;s payment discipline with respect to the Rental Agreement.
          </p>

          <p>
            3.&nbsp;&nbsp;&nbsp;&nbsp;The Customer consents to the Lessor processing and disclosing to the Partner the Personal Data:
          </p>
          <p className="pl-6">
            3.1. To ensure fast onboarding of the rental service through automatic completion of booking forms and rental agreements;
          </p>
          <p className="pl-6">
            3.2. To create the Client&rsquo;s trustworthiness profile as a lessee and driver for the purpose of issuing the Client&rsquo;s rating and sharing it with rental companies globally aiming to help rental companies, including the Lessor, offering the best rental offers and renting out safely.
          </p>

          <p>
            4.&nbsp;&nbsp;&nbsp;&nbsp;The Client is informed about and agrees to the Lessor (where appropriate) disclosing the Personal Data to the Partner in accordance with the data protection agreement concluded with them in compliance with the European Union&rsquo;s Regulation 2016/679 and Directive 2016/680 (hereinafter referred to as the GDPR) and published on the Partner&rsquo;s website http://cardooworld.com.
          </p>

          <p>
            5.&nbsp;&nbsp;&nbsp;&nbsp;The Client consents to the Partner to process the Personal Data after the Partner has fulfilled their duties as Guarantor during the Client&rsquo;s lifetime for the purpose specified in clauses 3.1. and 3.2. herein.
          </p>

          <p>
            6.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor undertakes to adopt all necessary organizational and technical measures to protect Client&rsquo;s confidential information and Personal Data from unauthorized and accidental access, destruction, modification, blocking, copying, as well as from other illegal actions.
          </p>

          <p>
            7.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor shall not disseminate confidential information and Personal Data without Client's consent or other legal basis.
          </p>

          <p>
            8.&nbsp;&nbsp;&nbsp;&nbsp;The Client agrees that if they fail to pay any excess costs incurred by them as the result of the Client&rsquo;s use of the property (vehicle etc.) as per the Rental Agreement, the Client shall pay to the Partner a handling fee of up to EUR 500 in the Partner&rsquo;s discretion.
          </p>
        </div>

        {/* Client Signature Area */}
        <div className="mt-8 flex justify-end">
          <div className="w-[300px]">
            <div className="flex items-end text-[12.5px]">
              <span className="whitespace-nowrap font-normal">Client Signature</span>
              <div className="flex-1 border-b border-black h-16 ml-2 relative flex items-end justify-center pb-1">
                {customerSignature ? (
                  <img
                    src={customerSignature}
                    alt="Client Signature"
                    className="max-h-14 max-w-[200px] object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400 pb-0.5 print:hidden">(Pending Signature)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
