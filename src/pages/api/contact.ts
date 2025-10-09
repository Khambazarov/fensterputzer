import type { APIRoute } from "astro";
import * as nodemailer from "nodemailer";

export const prerender = false; // wichtig: serverless, nicht statisch rendern

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const fd = await request.formData();

    // Honeypot: wenn gefüllt -> still ok
    const bot = String(fd.get("website") || "").trim();
    if (bot) return new Response(null, { status: 204 });

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const telefon = String(fd.get("telefon") || "").trim();
    const kunde = String(fd.get("kunde") || "").trim();
    const ort = String(fd.get("ort") || "").trim();
    const nachricht = String(fd.get("nachricht") || "").trim();
    const ds = String(fd.get("datenschutz") || "");

    if (!name || !nachricht || !isEmail(email) || ds !== "on") {
      return new Response("Bad Request", { status: 400 });
    }

    // Transport per SMTP (Domain-Postfach)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // z.B. smtp.ionos.de
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER, // z.B. kontakt@deine-domain.de
        pass: process.env.SMTP_PASS,
      },
    });

    const MAIL_FROM = String(process.env.MAIL_FROM); // = Absender (deine Domain!)
    const MAIL_TO = String(process.env.MAIL_TO || process.env.MAIL_FROM);

    await transporter.sendMail({
      from: `"Webformular" <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `Neue Anfrage Fensterreinigung — ${name}`,
      text:
        `Name: ${name}\n` +
        `E-Mail: ${email}\n` +
        (telefon ? `Telefon: ${telefon}\n` : "") +
        (kunde ? `Kunde: ${kunde}\n` : "") +
        (ort ? `Ort/PLZ: ${ort}\n` : "") +
        `\nNachricht:\n${nachricht}\n`,
    });

    // Erfolgreich -> Danke-Seite (legen wir später an)
    return redirect("/danke", 303);
  } catch (err) {
    // Log nur in Server-Logs
    console.error("MAIL_ERROR", err);
    return new Response("Server Error", { status: 500 });
  }
};
