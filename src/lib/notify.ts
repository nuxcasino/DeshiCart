import nodemailer from "nodemailer";
import type { Order, OrderItem } from "@/db/schema";

// Server-only notifications. Both channels are provider-configurable and
// degrade to a console log when credentials are absent — order placement
// must never fail because notifications aren't set up.

export function orderCode(id: number): string {
  return `DC-${String(id).padStart(5, "0")}`;
}

/** Normalize Bangladeshi MSISDNs to 8801XXXXXXXXX for SMS APIs. */
function normalizeMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^8801\d{9}$/.test(digits)) return digits;
  if (/^01\d{9}$/.test(digits)) return `880${digits.slice(1)}`;
  if (/^1\d{9}$/.test(digits)) return `880${digits}`;
  return null;
}

async function sendSms(phone: string, message: string): Promise<void> {
  const apiToken = process.env.SSLW_API_TOKEN;
  const sid = process.env.SSLW_SID;
  if (!apiToken || !sid) {
    console.log(`[notify:sms:skipped] to=${phone} msg=${message}`);
    return;
  }
  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) {
    console.log(`[notify:sms:bad-number] phone=${phone}`);
    return;
  }
  const res = await fetch("https://smsplus.sslwireless.com/api/v3/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_token: apiToken,
      sid,
      msisdn,
      sms: message,
      csms_id: `deshicart-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data?.status).toUpperCase() !== "SUCCESS") {
    throw new Error(`SMS send failed: ${JSON.stringify(data).slice(0, 200)}`);
  }
}

function mailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = mailTransport();
  if (!transport || !from) {
    console.log(`[notify:email:skipped] to=${to} subject=${subject}`);
    return;
  }
  await transport.sendMail({ from, to, subject, html });
}

function receiptHtml(
  order: Order,
  items: Array<Pick<OrderItem, "name" | "price" | "quantity">>
): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.name} × ${i.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right">৳${(i.price * i.quantity).toLocaleString("en-IN")}</td></tr>`
    )
    .join("");
  return (
    `<h2>DeshiCart order ${orderCode(order.id)} confirmed 🎉</h2>` +
    `<p>Hi ${order.customerName}, your order is being packed and will reach ${order.city} in 2–4 days.</p>` +
    `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
    `<p>Subtotal: ৳${order.subtotal.toLocaleString("en-IN")}<br/>` +
    (order.discount > 0
      ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: −৳${order.discount.toLocaleString("en-IN")}<br/>`
      : "") +
    `Delivery: ${order.shipping === 0 ? "Free" : "৳" + order.shipping.toLocaleString("en-IN")}<br/>` +
    `<strong>Total: ৳${order.total.toLocaleString("en-IN")}</strong></p>` +
    `<p>Delivering to: ${order.address}, ${order.city} · ${order.phone}</p>`
  );
}

async function safeNotify(task: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[notify:${task}:failed]`, (error as Error)?.message ?? error);
  }
}

/** COD order placed (or any order confirmed without online payment). */
export async function notifyOrderPlaced(
  order: Order,
  items: Array<Pick<OrderItem, "name" | "price" | "quantity">>
): Promise<void> {
  const code = orderCode(order.id);
  const total = `৳${order.total.toLocaleString("en-IN")}`;
  await safeNotify("order-placed", async () => {
    await Promise.all([
      sendSms(
        order.phone,
        `DeshiCart: Order ${code} (${total}) confirmed. Delivery in 2-4 days to ${order.city}.`
      ),
      sendEmail(order.email, `DeshiCart order ${code} confirmed`, receiptHtml(order, items)),
    ]);
  });
}

/** Online payment verified. */
export async function notifyPaymentReceived(order: Order): Promise<void> {
  const code = orderCode(order.id);
  const total = `৳${order.total.toLocaleString("en-IN")}`;
  await safeNotify("payment-received", async () => {
    await Promise.all([
      sendSms(
        order.phone,
        `DeshiCart: Payment ${total} received for order ${code}. Packing now!`
      ),
      sendEmail(
        order.email,
        `DeshiCart payment received — ${code}`,
        `<h2>Payment received ✅</h2><p>Hi ${order.customerName}, we received ${total} for order ${code}. It's being packed for delivery to ${order.city}.</p>`
      ),
    ]);
  });
}

/** Fulfilment status changed from the admin panel. */
export async function notifyStatusChange(
  order: Order,
  from: string,
  to: string
): Promise<void> {
  const code = orderCode(order.id);
  const verb =
    to === "shipped"
      ? "has shipped and is on its way"
      : to === "delivered"
        ? "has been delivered. Enjoy!"
        : to === "cancelled"
          ? "was cancelled. Contact us if you need help."
          : `is now ${to}`;
  await safeNotify("status-change", async () => {
    await Promise.all([
      sendSms(order.phone, `DeshiCart: Order ${code} ${verb}.`),
      sendEmail(
        order.email,
        `DeshiCart order ${code} update: ${to}`,
        `<h2>Order ${code} update</h2><p>Hi ${order.customerName}, your order ${verb}</p>`
      ),
    ]);
  });
}
