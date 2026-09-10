// Shared configuration for Address Helper extension
const FIELD_DEFINITIONS = [
  { key: "destPinCode", selector: '#deliveryPincode' },
  { key: "senderName", selector: '#senderName' },
  { key: "senderAddress", selector: '#senderAddress' },
  { key: "senderMobile", selector: '#senderMobileNumber' },
  { key: "senderEmail", selector: '#senderEmail' },
  { key: "senderGST", selector: '#senderGST' },
  { key: "kycNumber", selector: '#kycDocumentNo' },
  { key: "receiverName", selector: '#receiverName' },
  { key: "receiverAddress", selector: '#receiverAddress' },
  { key: "receiverMobile", selector: '#mobileNumber' },
  { key: "receiverEmail", selector: '#receiverEmail' },
  { key: "content", selector: '#content' },
  { key: "weight", selector: '#weight' },
  { key: "valueInr", selector: '#value' },
  { key: "freight", selector: '#freight' }
];

const DB_CONFIG = {
  name: "ContactAutofillDB",
  version: 2,
  objectStore: "profiles"
};

const TARGET_DOMAIN = "innofulfill.com";
