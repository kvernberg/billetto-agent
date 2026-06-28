const nodemailer = require("nodemailer");

const URL = "https://billetto.no/sales_tracker/events/7575fc1d-2382-454d-8639-d88a06569bb9";

async function main() {
  const res = await fetch(URL);
  const html = await res.text();

  const ticketsMatch = html.match(/<span>(\d+)\s*\/\s*(\d+)<\/span>/);
  const priceMatch = html.match(/Pris[\s\S]*?<span>([\d,.]+)\s*NOK<\/span>/);

  if (!ticketsMatch) {
    throw new Error("Fant ikke billettall i HTML.");
  }

  const sold = Number(ticketsMatch[1]);
  const capacity = Number(ticketsMatch[2]);
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
