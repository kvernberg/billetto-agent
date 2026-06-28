const { chromium } = require("playwright");
const nodemailer = require("nodemailer");

const URL = "https://billetto.no/sales_tracker/events/7575fc1d-2382-454d-8639-d88a06569bb9";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  const text = await page.locator("body").innerText();
  await browser.close();

  const ticketsMatch = text.match(/Billetter\s+(\d+)\s*\/\s*(\d+)/i);
  const percentMatch = text.match(/Prosent utsolgt\s+(\d+)%/i);
  const remainingMatch = text.match(/Resterende billetter\s+(\d+)/i);
  const priceMatch = text.match(/Pris\s+([\d,.]+)\s*NOK/i);

  if (!ticketsMatch) throw new Error("Fant ikke billettall på siden.");

  const sold = Number(ticketsMatch[1]);
  const capacity = Number(ticketsMatch[2]);
  const percent = percentMatch ? Number(percentMatch[1]) : Math.round((sold / capacity) * 100);
  const remaining = remainingMatch ? Number(remainingMatch[1]) : capacity - sold;
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
