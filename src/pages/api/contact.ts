// src/pages/api/contact.ts
import type { APIRoute } from "astro";
// CJS-kompatibler Import – funktioniert ohne esModuleInterop
import nodemailer from "nodemailer";

export const prerender = false; // Serverless-Route, nicht statisch rendern

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

function isValidDateISO(s: string) {
  // "YYYY-MM-DD"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  // Date muss gültig sein und den gleichen ISO-String ergeben
  return !isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
}

function isValidTimeHHMM(s: string) {
  // "HH:MM"
  return /^\d{2}:\d{2}$/.test(s);
}

function minutesFromHHMM(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function isBlockedHolidayDate(d: Date) {
  const m = d.getMonth() + 1; // 1..12
  const day = d.getDate();
  const md = `${m.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return (
    md === "01-01" ||
    md === "04-05" ||
    md === "12-24" ||
    md === "12-25" ||
    md === "12-26" ||
    md === "12-31"
  );
}

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const fd = await request.formData();

    // Honeypot (Spam)
    const bot = String(fd.get("website") || "").trim();
    if (bot) return new Response(null, { status: 204 });

    // Pflichtfelder
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const telefon = String(fd.get("telefon") || "").trim(); // required
    const kunde = String(fd.get("kunde") || "").trim();

    // Adresse
    const strasse = String(fd.get("strasse") || "").trim();
    const ort = String(fd.get("ort") || "").trim();
    const plz = String(fd.get("plz") || "").trim();

    // Terminwunsch (optional)
    const wunschtermin = String(fd.get("wunschtermin") || "").trim(); // YYYY-MM-DD
    const wunschzeit = String(fd.get("wunschzeit") || "").trim(); // HH:MM

    const nachricht = String(fd.get("nachricht") || "").trim();
    const ds = String(fd.get("datenschutz") || "");

    // Basis-Validierung
    if (
      !name ||
      !nachricht ||
      !isEmail(email) ||
      ds !== "on" ||
      !telefon ||
      !strasse ||
      !ort
    ) {
      return new Response("Bad Request", { status: 400 });
    }

    // Zusatz-Validierung: Datum/Zeit (falls angegeben)
    if (wunschtermin) {
      if (!isValidDateISO(wunschtermin))
        return new Response("Bad Request", { status: 400 });

      // Heute (Server)
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayISO = `${yyyy}-${mm}-${dd}`;

      if (wunschtermin < todayISO)
        return new Response("Bad Request", { status: 400 });

      const d = new Date(wunschtermin + "T00:00:00");
      if (d.getDay() === 0) return new Response("Bad Request", { status: 400 }); // Sonntag
      if (isBlockedHolidayDate(d))
        return new Response("Bad Request", { status: 400 }); // feste Feiertage
    }

    if (wunschzeit) {
      if (!isValidTimeHHMM(wunschzeit))
        return new Response("Bad Request", { status: 400 });
      const mins = minutesFromHHMM(wunschzeit);
      if (mins < 360 || mins > 1080)
        return new Response("Bad Request", { status: 400 }); // 06:00–18:00
      if (mins % 60 !== 0) return new Response("Bad Request", { status: 400 }); // volle Stunden
    }

    // SMTP-Transport (ENV in Netlify setzen!)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // z.B. smtp.ionos.de
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER, // z.B. kontakt@deine-domain.de
        pass: process.env.SMTP_PASS,
      },
    });

    const MAIL_FROM = String(process.env.MAIL_FROM); // Absender (Domain!)
    const MAIL_TO = String(process.env.MAIL_TO || process.env.MAIL_FROM); // Empfänger

    // Mail zusammenbauen
    const lines = [
      `Name: ${name}`,
      `E-Mail: ${email}`,
      `Telefon: ${telefon}`,
      kunde ? `Kunde: ${kunde}` : "",
      `Adresse: ${strasse}, ${plz ? plz + " " : ""}${ort}`,
      wunschtermin || wunschzeit
        ? `Wunschtermin: ${[wunschtermin, wunschzeit]
            .filter(Boolean)
            .join(" ")}`
        : "",
      "",
      "Nachricht:",
      nachricht,
      "",
    ].filter(Boolean);

    await transporter.sendMail({
      from: `"Webformular" <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `Neue Anfrage Fensterreinigung — ${name}`,
      text: lines.join("\n"),
    });

    // Erfolgreich → Danke-Seite
    return redirect("/danke", 303);
  } catch (err) {
    console.error("MAIL_ERROR", err);
    return new Response("Server Error", { status: 500 });
  }
};
