import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail } from "@/lib/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

/** Contact form → email to the shop inbox (or logged when SMTP is unset). */
export async function POST(request: Request) {
  if (isRateLimited(`contact:${clientIp(request)}`, 5, 60_000)) {
    return rateLimitedResponse();
  }
  try {
    const data = await request.json();
    const name = String(data.name ?? "").trim().slice(0, 80);
    const email = String(data.email ?? "").trim().slice(0, 160);
    const subject = String(data.subject ?? "").trim().slice(0, 160);
    const message = String(data.message ?? "").trim().slice(0, 3000);
    if (!name || !isValidEmail(email) || !subject || !message) {
      return NextResponse.json(
        { error: "Name, a valid email, subject and message are required." },
        { status: 400 }
      );
    }

    const to = process.env.SHOP_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    if (!to || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(`[contact:skipped] from=${email} subject=${subject}`);
      return NextResponse.json({ ok: true });
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || SMTP_USER,
      to,
      replyTo: email,
      subject: `[DeshiCart contact] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
