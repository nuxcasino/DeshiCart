import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import nodemailer from "nodemailer";
import { isValidEmail } from "@/lib/auth";
import { validationHook } from "../validate";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

const contactBody = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().max(160).refine(isValidEmail, "Invalid email."),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(3000),
});

const app = new Hono().post(
  "/",
  zValidator("json", contactBody, validationHook),
  async (c) => {
    if (isRateLimited(`contact:${clientIp(c.req.raw)}`, 5, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");

    const to =
      process.env.SHOP_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    if (!to || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(`[contact:skipped] from=${input.email} subject=${input.subject}`);
      return c.json({ ok: true });
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
      replyTo: input.email,
      subject: `[DeshiCart contact] ${input.subject}`,
      text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    });
    return c.json({ ok: true });
  }
);

export type ContactRoute = typeof app;
export default app;
