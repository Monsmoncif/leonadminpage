import { formatDateDMY } from "./date-utils";
import { isResidentClient } from "./client-utils";

export interface PrivacyConsentData {
  clientName: string;
  clientIdNumber: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  contractDate: string;
  customerSignature?: string;
  envelopeId?: string;
}

export function extractPrivacyConsentData(contract: any): PrivacyConsentData {
  const client = (contract?.clientId && typeof contract.clientId === "object") 
    ? contract.clientId 
    : (contract?.clientObj && typeof contract.clientObj === "object" 
        ? contract.clientObj 
        : (contract?.client && typeof contract.client === "object" ? contract.client : {}));
  
  const isPersonalized = contract?.contractType === "Personalized";
  const clientName = (isPersonalized ? contract?.personalizedPersonName : "") || 
    client.name || 
    contract?.customer || 
    contract?.personalizedPersonName || 
    (isPersonalized ? (contract?.additionalDriverName || "Personal Use") : "") || 
    "";

  const isResident = isResidentClient(client, contract);
  const clientIdNumber = (isResident ? (client.idNumber || client.passportNumber) : (client.passportNumber || client.idNumber)) ||
    client.idNumber ||
    client.passportNumber ||
    contract?.customerIdNumber ||
    contract?.passportNumber || 
    client.licenseNumber || 
    contract?.customerLicense ||
    contract?.additionalDriverLicense || 
    "";

  // Comprehensive address extraction with all possible field fallbacks
  const rawAddress = (
    client.address || 
    client.residentialAddress || 
    client.permanentAddress || 
    client.addressInUae || 
    contract?.customerAddress || 
    contract?.address || 
    (contract?.pickupLocation && contract.pickupLocation !== "Main Office" ? contract.pickupLocation : "") ||
    ""
  ).trim();

  // If address is the placeholder "Hotel / Tourist stay" or "Local residence", try better fallback
  let clientAddress = rawAddress;
  if (!clientAddress || clientAddress.toLowerCase() === "hotel / tourist stay" || clientAddress.toLowerCase() === "local residence") {
    if (contract?.pickupLocation && contract.pickupLocation !== "Main Office") {
      clientAddress = `${contract.pickupLocation}, Dubai, UAE`;
    } else if (client.nationality) {
      clientAddress = `${client.nationality}${!isResident ? " (Tourist)" : ""}, UAE`;
    } else {
      clientAddress = "Dubai, United Arab Emirates";
    }
  }

  const clientEmail = client.email || contract?.customerEmail || "";
  const rawPhone = client.phone || contract?.customerPhone || contract?.additionalDriverPhone || "";
  const clientPhone = rawPhone.trim();

  const rawDate = contract?.createdAt || contract?.startDate || new Date();
  const contractDate = formatDateDMY(rawDate) || "";

  const rawId = contract?._id ? contract._id.toString() : (contract?.id || "000000000000");
  const contractNum = contract?.contractNumber ? String(contract.contractNumber) : "";
  const envelopeId = `5B8CF849-${contractNum ? contractNum.padStart(4, "0") : rawId.substring(0, 4).toUpperCase()}-4760-A385-F04E06B88655`;

  const customerSignature = contract?.customerSignature || "";

  return {
    clientName,
    clientIdNumber,
    clientAddress,
    clientEmail,
    clientPhone,
    contractDate,
    customerSignature,
    envelopeId,
  };
}

export function buildPrivacyConsentHtml(contract: any): string {
  const data = extractPrivacyConsentData(contract);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Privacy Notice and Consent - ${data.clientName || "Client"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm 15mm 20mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 9.8pt;
      line-height: 1.32;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      padding: 10px 0;
    }
    .docusign-header {
      font-size: 7.5pt;
      color: #333333;
      margin-bottom: 8px;
      font-family: Arial, sans-serif;
    }
    .logo-row {
      margin-bottom: 12px;
    }
    .logo-text {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -1.5px;
      color: #000000;
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
    .doc-title {
      text-align: center;
      font-size: 11.5pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 4px 0 16px 0;
    }
    .date-row {
      text-align: right;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }
    .date-val {
      display: inline-block;
      min-width: 90px;
      border-bottom: 1px solid #000;
      text-align: center;
      padding-bottom: 1px;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: normal;
      margin-bottom: 6px;
    }
    .client-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin-bottom: 14px;
    }
    .client-table td {
      border: 1px solid #000000;
      padding: 5px 8px;
      font-size: 9.2pt;
      vertical-align: middle;
    }
    .client-table td.label-col {
      width: 28%;
      font-weight: normal;
      background-color: #ffffff;
    }
    .client-table td.value-col {
      width: 72%;
      font-weight: 600;
    }
    .clauses-text {
      font-size: 8.5pt;
      line-height: 1.34;
      text-align: justify;
      color: #000000;
    }
    .clause-p {
      margin-bottom: 8px;
      text-indent: 0;
    }
    .subclause-p {
      margin-bottom: 5px;
      padding-left: 20px;
    }
    .signature-area {
      margin-top: 35px;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }
    .signature-block {
      width: 280px;
      text-align: left;
    }
    .signature-line {
      display: flex;
      align-items: flex-end;
      font-size: 9.5pt;
    }
    .signature-box {
      flex: 1;
      height: 55px;
      border-bottom: 1px solid #000000;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 2px;
    }
    .signature-img {
      max-height: 52px;
      max-width: 180px;
      object-fit: contain;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      .page-container {
        max-width: 100%;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="docusign-header">
      DocuSign Envelope ID: ${data.envelopeId}
    </div>

    <div class="logo-row">
      <div class="logo-text">cardoo</div>
    </div>

    <div class="doc-title">
      PRIVACY NOTICE AND CONSENT
    </div>

    <div class="date-row">
      Date <span class="date-val">${data.contractDate || "________________"}</span>
    </div>

    <div class="section-title">
      1.&nbsp;&nbsp;&nbsp;&nbsp;The Client
    </div>

    <table class="client-table">
      <tr>
        <td class="label-col">Full name</td>
        <td class="value-col">${data.clientName || ""}</td>
      </tr>
      <tr>
        <td class="label-col">Passport / ID number</td>
        <td class="value-col">${data.clientIdNumber || ""}</td>
      </tr>
      <tr>
        <td class="label-col">Residential address</td>
        <td class="value-col">${data.clientAddress || ""}</td>
      </tr>
      <tr>
        <td class="label-col">E-mail</td>
        <td class="value-col">${data.clientEmail || ""}</td>
      </tr>
      <tr>
        <td class="label-col">Phone number</td>
        <td class="value-col">${data.clientPhone ? (data.clientPhone.trim().startsWith("+") ? data.clientPhone.trim() : (data.clientPhone.trim().startsWith("05") ? `+971 ${data.clientPhone.trim().slice(1)}` : data.clientPhone.trim())) : ""}</td>
      </tr>
    </table>

    <div class="clauses-text">
      <div class="clause-p">
        herewith is informed by the Lessor <strong>Leon Car Rental L.L.C</strong> ,registration number <strong>1029208</strong>, (UAE) that the Lessor will collect, store, and use the Client&rsquo;s personal data disclosed with respect to the Rental Agreement according to their legitimate interest, including: full name, telephone number, e-mail address, residential address, passport details such as number, issue and expiry dates, issuing body, date of birth, gender and other details specified in the Client&rsquo;s personal identification document (referred to as the Personal Data).
      </div>

      <div class="clause-p">
        2.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor will disclose the Client&rsquo;s Personal Data to their partner company, Cardoo Cyprus Ltd, registry code HE434654, Sotiri Michailidi &amp; 28 Oktovriou, LOPHITIS INTERNATIONAL CENTRE, 7th floor, 3035 Limassol, Cyprus, email: privacy@cardooworld.com (referred to as the Partner), and other third parties, as the case may be, according to their legitimate interest for the following purposes:
      </div>
      <div class="subclause-p">
        2.1. To perform as a guarantor for the Client&rsquo;s liabilities in favor of the Lessor;
      </div>
      <div class="subclause-p">
        2.2. To arrange for the subsequent transfer of the Personal Data to a collection agent, either directly or via the Partner, as and when the Client may not pay their due under the Rental Agreement;
      </div>
      <div class="subclause-p">
        2.3. To transfer to a credit reference agency details on the Client&rsquo;s payment discipline with respect to the Rental Agreement.
      </div>

      <div class="clause-p">
        3.&nbsp;&nbsp;&nbsp;&nbsp;The Customer consents to the Lessor processing and disclosing to the Partner the Personal Data:
      </div>
      <div class="subclause-p">
        3.1. To ensure fast onboarding of the rental service through automatic completion of booking forms and rental agreements;
      </div>
      <div class="subclause-p">
        3.2. To create the Client&rsquo;s trustworthiness profile as a lessee and driver for the purpose of issuing the Client&rsquo;s rating and sharing it with rental companies globally aiming to help rental companies, including the Lessor, offering the best rental offers and renting out safely.
      </div>

      <div class="clause-p">
        4.&nbsp;&nbsp;&nbsp;&nbsp;The Client is informed about and agrees to the Lessor (where appropriate) disclosing the Personal Data to the Partner in accordance with the data protection agreement concluded with them in compliance with the European Union&rsquo;s Regulation 2016/679 and Directive 2016/680 (hereinafter referred to as the GDPR) and published on the Partner&rsquo;s website http://cardooworld.com.
      </div>

      <div class="clause-p">
        5.&nbsp;&nbsp;&nbsp;&nbsp;The Client consents to the Partner to process the Personal Data after the Partner has fulfilled their duties as Guarantor during the Client&rsquo;s lifetime for the purpose specified in clauses 3.1. and 3.2. herein.
      </div>

      <div class="clause-p">
        6.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor undertakes to adopt all necessary organizational and technical measures to protect Client&rsquo;s confidential information and Personal Data from unauthorized and accidental access, destruction, modification, blocking, copying, as well as from other illegal actions.
      </div>

      <div class="clause-p">
        7.&nbsp;&nbsp;&nbsp;&nbsp;The Lessor shall not disseminate confidential information and Personal Data without Client's consent or other legal basis.
      </div>

      <div class="clause-p">
        8.&nbsp;&nbsp;&nbsp;&nbsp;The Client agrees that if they fail to pay any excess costs incurred by them as the result of the Client&rsquo;s use of the property (vehicle etc.) as per the Rental Agreement, the Client shall pay to the Partner a handling fee of up to EUR 500 in the Partner&rsquo;s discretion.
      </div>
    </div>

    <div class="signature-area">
      <div class="signature-block">
        <div class="signature-line">
          <span>Client Signature</span>
          <div class="signature-box">
            ${data.customerSignature ? `<img src="${data.customerSignature}" alt="Client Signature" class="signature-img" />` : ""}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
