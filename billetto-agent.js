const nodemailer = require("nodemailer");

const URL = "https://billetto.no/sales_tracker/events/7575fc1d-2382-454d-8639-d88a06569bb9";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumberAfter(label, text) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index === -1) return null;

  const slice = text.slice(index, index + 300);
  const match = slice.match(/(\d+)\s*\/\s*(\d+)/);

  return match
    ? { sold: Number(match[1]), capacity: Number(match[2]) }
    : null;
}

async function main() {
  const res = await fetch(URL);

  if (!res.ok) {
    throw new Error(`Billetto svarte med status ${res.status}`);
  }

  const html = await res.text();
  const text = stripHtml(html);

  const tickets = extractNumberAfter("Billetter", text);

  if (!tickets) {
    throw new Error("Fant ikke billettall etter teksten 'Billetter'.");
  }

  const priceMatch = text.match(/Pris\s+([\d,.]+)\s*NOK/i);

  const sold = tickets.sold;
  const capacity = tickets.capacity;
  const percent = Math.round((sold / capacity) * 100);
  const remaining = capacity - sold;
  const price = priceMatch ? priceMatch[1] : "ukjent";

  const body =
`Ålesund
Solgt: ${sold}
Kapasitet: ${capacity}
Prosent: ${percent}%
Resterende: ${remaining}
Pris: ${price} NOK
Kilde: Billetto
Dato: ${new Date().toISOString()}`;

  console.log(body);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_TO || process.env.GMAIL_USER,
    subject: "Billetto Ålesund salg",
    text: body
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
