const fs = require("fs");
const { chromium } = require("playwright");

const SESSION_URL = "https://billetto.no/sales_tracker/session/new/2F6CB462:FJZoXKWDYDqq2VJvs0oBEN7gI9F75MTucTfjR1Z3";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(SESSION_URL, { waitUntil: "networkidle" });

  const text = await page.locator("body").innerText();
  fs.writeFileSync("debug.txt", text);

  const ticketsMatch = text.match(/Billetter\s+(\d+)\s*\/\s*(\d+)/i);
  const priceMatch = text.match(/Pris\s+([\d,.]+)\s*NOK/i);

  if (!ticketsMatch) {
    console.log(text.slice(0, 1200));
    throw new Error("Fant ikke billettall.");
  }

  const sold = Number(ticketsMatch[1]);
  const capacity = Number(ticketsMatch[2]);
  const price = priceMatch ? Number(priceMatch[1].replace(",", ".")) : null;

  const status = {
    updated_at: new Date().toISOString(),
    source: "Billetto",
    venue: "Ålesund",
    sold,
    capacity,
    remaining: capacity - sold,
    percent_sold: Number(((sold / capacity) * 100).toFixed(1)),
    price_nok: price,
    url: SESSION_URL
  };

  fs.writeFileSync("status.json", JSON.stringify(status, null, 2) + "\n");
  console.log(status);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
