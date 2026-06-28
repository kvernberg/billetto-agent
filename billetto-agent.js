const fs = require("fs");

const EVENT_URL = "https://billetto.no/sales_tracker/events/7575fc1d-2382-454d-8639-d88a06569bb9";
const SESSION_URL = "https://billetto.no/sales_tracker/session/new/2F6CB462:FJZoXKWDYDqq2VJvs0oBEN7gI9F75MTucTfjR1Z3";

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

async function fetchWithCookies(url, cookieHeader = "") {
  const res = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    }
  });

  return res;
}

function cookiesFrom(res) {
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return setCookie.map(c => c.split(";")[0]).join("; ");
}

async function main() {
  let cookieHeader = "";

  const sessionRes = await fetchWithCookies(SESSION_URL);
  cookieHeader = cookiesFrom(sessionRes);

  let targetUrl = EVENT_URL;
  if (sessionRes.status >= 300 && sessionRes.status < 400) {
    const location = sessionRes.headers.get("location");
    if (location) targetUrl = new URL(location, SESSION_URL).toString();
  }

  const eventRes = await fetchWithCookies(targetUrl, cookieHeader);
  const html = await eventRes.text();

  fs.writeFileSync("debug.html", html);

  const text = stripHtml(html);
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
    url: EVENT_URL
  };

  fs.writeFileSync("status.json", JSON.stringify(status, null, 2) + "\n");
  console.log(status);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
