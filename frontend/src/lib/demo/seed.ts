import type { Account } from "@/lib/accounts/types";

/** Fictional store used by `/demo`. Any resemblance to a real business is accidental. */
export const DEMO_STORE_NAME = "Juniper Lane Boutique";

export type DemoDocument = {
  file_id: string;
  filename: string;
  /** Plain text served for preview (`/content` for txt/md, `/text` for docx). */
  content: string;
  /** Seeded as still ingesting so the library visibly finishes indexing on load. */
  startsProcessing?: boolean;
};

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    file_id: "demo-returns-policy",
    filename: "Returns-and-Exchanges-Policy.md",
    content: `# Returns & Exchanges Policy

_Juniper Lane Boutique — effective March 1, 2026_

## Standard returns
Full-price items can be returned within 30 days of purchase with the original receipt. Items must be unworn, with all tags attached. Refunds go back to the original payment method.

## Without a receipt
Without a receipt, we can look up the purchase by the customer's phone number or card. If we can't find it, offer store credit at the item's lowest selling price in the last 30 days.

## Final sale
Items marked down 40% or more are final sale — no returns, exchanges only for a different size of the same item. Earrings, swimwear and intimates are always final sale for hygiene reasons.

## Exchanges
Exchanges for a different size or colour are allowed within 45 days, even after the return window closes.

## Damaged items
If a customer reports a defect, accept the return at any time within 90 days and log it in the Damages binder behind the counter. Do not put damaged items back on the floor.
`,
  },
  {
    file_id: "demo-open-close",
    filename: "Opening-and-Closing-Checklist.txt",
    content: `OPENING (arrive 30 min before doors)
1. Disarm alarm — code is on the key fob card in the manager's lockbox.
2. Lights on: front panel first, then fitting rooms.
3. Count the float: $200 in the till — $100 in fives and tens, $100 in coins and ones.
4. Steam any new arrivals on the "to floor" rack.
5. Check the shared inbox for online pickup orders and pull them to the hold shelf.

CLOSING (start 15 min before doors close)
1. Last call in fitting rooms at 10 minutes to close.
2. Run the end-of-day report on the POS and print two copies.
3. Count the till down to the $200 float; the rest goes in the deposit bag.
4. Deposit bag goes in the back safe — never leave cash in the till overnight.
5. Return fitting room items to the floor, lights off, set the alarm.
`,
  },
  {
    file_id: "demo-holiday-hours",
    filename: "Holiday-Hours-2026.md",
    content: `# Holiday Hours 2026

| Date | Hours |
|---|---|
| Thanksgiving (Oct 12) | Closed |
| Black Friday (Nov 27) | 8am – 9pm |
| Dec 1 – Dec 23 | 10am – 8pm |
| Christmas Eve (Dec 24) | 10am – 4pm |
| Christmas Day (Dec 25) | Closed |
| Boxing Day (Dec 26) | 9am – 7pm |
| New Year's Eve (Dec 31) | 10am – 5pm |
| New Year's Day (Jan 1) | Closed |

Staff working Boxing Day get time-and-a-half. Holiday shift swaps must be approved by a manager at least 7 days ahead.
`,
  },
  {
    file_id: "demo-employee-discount",
    filename: "Employee-Discount-Policy.docx",
    content: `Employee Discount Policy

All staff get 30% off full-price items and 10% off sale items after their first 30 days.

The discount is for the employee and one immediate family member only. Ring it up under your own employee number — never another staff member's.

Employee purchases must be rung up by a different staff member, not yourself.

The discount cannot be combined with other promotions or used on gift cards.
`,
  },
  {
    file_id: "demo-gift-cards",
    filename: "Gift-Card-FAQ.md",
    content: `# Gift Card FAQ

**Do gift cards expire?** No. Gift cards never expire and have no fees.

**Can a gift card be refunded for cash?** No, except where the remaining balance is under $5 — then the customer can ask for the balance in cash.

**Lost gift cards:** We can only replace a lost card if the customer has the original purchase receipt with the card number on it.

**Checking a balance:** Scan the card on the POS and choose Gift Card > Balance Inquiry.
`,
  },
  {
    file_id: "demo-pos-troubleshooting",
    filename: "POS-Troubleshooting.txt",
    content: `POS TROUBLESHOOTING

Card reader not connecting:
Unplug the reader's USB cable, wait 10 seconds, plug it back in. If it still says "offline", restart the iPad. Still broken? Take cash or e-transfer and call the POS support line on the sticker under the counter.

Receipt printer jammed:
Open the lid, pull the paper roll out, tear off the crumpled section and reload with the paper feeding from the bottom.

Price won't scan:
Key in the SKU from the tag manually. If the item isn't in the system, ask a manager before selling it.
`,
    startsProcessing: true,
  },
];

export const DEMO_ACCOUNTS_SEED: Account[] = [
  {
    id: "demo-account-maya",
    name: "Maya Thompson",
    username: "maya",
    role: "admin",
    is_primary_admin: true,
    is_active: true,
    created_at: "2026-02-03T15:00:00.000Z",
  },
  {
    id: "demo-account-jordan",
    name: "Jordan Lee",
    username: "jordan",
    role: "admin",
    is_primary_admin: false,
    is_active: true,
    created_at: "2026-03-11T18:30:00.000Z",
  },
  {
    id: "demo-account-priya",
    name: "Priya Patel",
    username: "priya",
    role: "staff",
    is_primary_admin: false,
    is_active: true,
    created_at: "2026-05-20T16:10:00.000Z",
  },
  {
    id: "demo-account-sam",
    name: "Sam Rivera",
    username: "sam",
    role: "staff",
    is_primary_admin: false,
    is_active: false,
    created_at: "2026-04-02T20:45:00.000Z",
  },
];

/**
 * Canned answers for the mock `/ask`. Each answer quotes exact passages of a
 * seeded document; the quote's position becomes the citation's char offsets.
 */
export type DemoAnswer = {
  keywords: string[];
  answer: string;
  sources: { file_id: string; quote: string }[];
};

export const DEMO_ANSWERS: DemoAnswer[] = [
  {
    keywords: ["return", "refund", "receipt"],
    answer:
      "Full-price items can be returned within 30 days with the original receipt, as long as they're unworn with tags attached — the refund goes back to the original payment method. Without a receipt, look the purchase up by phone number or card; if you can't find it, offer store credit at the item's lowest price in the last 30 days.",
    sources: [
      {
        file_id: "demo-returns-policy",
        quote:
          "Full-price items can be returned within 30 days of purchase with the original receipt.",
      },
      {
        file_id: "demo-returns-policy",
        quote:
          "If we can't find it, offer store credit at the item's lowest selling price in the last 30 days.",
      },
    ],
  },
  {
    keywords: ["final sale", "sale item", "markdown", "marked down", "swimwear", "earring"],
    answer:
      "Anything marked down 40% or more is final sale — no returns, only an exchange for a different size of the same item. Earrings, swimwear and intimates are always final sale.",
    sources: [
      {
        file_id: "demo-returns-policy",
        quote:
          "Items marked down 40% or more are final sale — no returns, exchanges only for a different size of the same item.",
      },
    ],
  },
  {
    keywords: ["exchange"],
    answer:
      "Exchanges for a different size or colour are allowed within 45 days — even after the 30-day return window has closed.",
    sources: [
      {
        file_id: "demo-returns-policy",
        quote:
          "Exchanges for a different size or colour are allowed within 45 days, even after the return window closes.",
      },
    ],
  },
  {
    keywords: ["damage", "defect", "broken item"],
    answer:
      "Accept returns for defective items any time within 90 days, log them in the Damages binder behind the counter, and keep them off the floor.",
    sources: [
      {
        file_id: "demo-returns-policy",
        quote:
          "accept the return at any time within 90 days and log it in the Damages binder behind the counter.",
      },
    ],
  },
  {
    keywords: ["float", "till", "open", "opening", "cash"],
    answer:
      "Start the till with a $200 float — $100 in fives and tens and $100 in coins and ones. At close, count the till back down to $200 and put the rest in the deposit bag, which goes in the back safe.",
    sources: [
      {
        file_id: "demo-open-close",
        quote: "Count the float: $200 in the till — $100 in fives and tens, $100 in coins and ones.",
      },
      {
        file_id: "demo-open-close",
        quote: "Count the till down to the $200 float; the rest goes in the deposit bag.",
      },
    ],
  },
  {
    keywords: ["close", "closing", "lock up", "end of day", "alarm"],
    answer:
      "Start closing 15 minutes before doors close: last call in fitting rooms at 10 minutes to close, run and print two copies of the end-of-day report, count the till down to the $200 float, put the deposit bag in the back safe, then lights off and set the alarm.",
    sources: [
      {
        file_id: "demo-open-close",
        quote: "Run the end-of-day report on the POS and print two copies.",
      },
      {
        file_id: "demo-open-close",
        quote: "Deposit bag goes in the back safe — never leave cash in the till overnight.",
      },
    ],
  },
  {
    keywords: ["holiday", "christmas", "boxing", "black friday", "hours", "new year", "thanksgiving"],
    answer:
      "Over the holidays the store is open 10am–8pm from Dec 1–23, 10am–4pm on Christmas Eve, closed Christmas Day, and 9am–7pm on Boxing Day (time-and-a-half for staff). Shift swaps need manager approval at least 7 days ahead.",
    sources: [
      { file_id: "demo-holiday-hours", quote: "| Dec 1 – Dec 23 | 10am – 8pm |" },
      {
        file_id: "demo-holiday-hours",
        quote: "Staff working Boxing Day get time-and-a-half.",
      },
    ],
  },
  {
    keywords: ["discount", "employee", "staff price"],
    answer:
      "After your first 30 days you get 30% off full-price items and 10% off sale items, for you and one immediate family member. Someone else has to ring up your purchase, and it can't be combined with other promotions or used on gift cards.",
    sources: [
      {
        file_id: "demo-employee-discount",
        quote:
          "All staff get 30% off full-price items and 10% off sale items after their first 30 days.",
      },
      {
        file_id: "demo-employee-discount",
        quote: "Employee purchases must be rung up by a different staff member, not yourself.",
      },
    ],
  },
  {
    keywords: ["gift card", "giftcard", "balance"],
    answer:
      "Gift cards never expire and have no fees. They can't be cashed out unless the remaining balance is under $5, and a lost card can only be replaced with the original receipt showing the card number.",
    sources: [
      { file_id: "demo-gift-cards", quote: "Gift cards never expire and have no fees." },
      {
        file_id: "demo-gift-cards",
        quote: "except where the remaining balance is under $5",
      },
    ],
  },
  {
    keywords: ["card reader", "pos", "printer", "scan", "offline", "sku"],
    answer:
      "If the card reader won't connect, unplug its USB cable for 10 seconds and plug it back in; if it still shows offline, restart the iPad. If that fails, take cash or e-transfer and call the POS support line on the sticker under the counter.",
    sources: [
      {
        file_id: "demo-pos-troubleshooting",
        quote: "Unplug the reader's USB cable, wait 10 seconds, plug it back in.",
      },
      {
        file_id: "demo-pos-troubleshooting",
        quote:
          "Take cash or e-transfer and call the POS support line on the sticker under the counter.",
      },
    ],
  },
];

/** Grounded-refusal copy mirroring the backend's (`app/retrieval/trust.py`). */
export const DEMO_REFUSAL =
  "I couldn't find enough grounded information in your store's documents to answer that. Try rephrasing, or ask a manager to upload the relevant policy.";

/** Conversation already on screen when `/demo` opens, so the app looks in use. */
export const DEMO_CHAT_TITLE = "Returns & till questions";

export const DEMO_CONVERSATION: string[] = [
  "Can a customer return something without a receipt?",
  "What's the opening float for the till?",
];

/** Earlier chats listed under History / Search chats on `/demo`. */
export const DEMO_PAST_CHATS: { title: string; daysAgo: number; questions: string[] }[] = [
  {
    title: "Holiday schedule",
    daysAgo: 1,
    questions: ["What are our Christmas Eve hours?", "Do we get extra pay on Boxing Day?"],
  },
  {
    title: "Staff discount",
    daysAgo: 3,
    questions: ["How much is the employee discount?"],
  },
  {
    title: "Card reader offline",
    daysAgo: 6,
    questions: ["The card reader says offline, what do I do?"],
  },
];
