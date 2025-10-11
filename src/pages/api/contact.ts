// … oben bleibt alles …

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const fd = await request.formData();

    // Honeypot
    const bot = String(fd.get("website") || "").trim();
    if (bot) return new Response(null, { status: 204 });

    // Pflichtfelder
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const telefon = String(fd.get("telefon") || "").trim(); // jetzt required
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

    // Transporter wie gehabt …
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const MAIL_FROM = String(process.env.MAIL_FROM);
    const MAIL_TO = String(process.env.MAIL_TO || process.env.MAIL_FROM);

    // Betreff + Body
    await transporter.sendMail({
      from: `"Webformular" <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `Neue Anfrage Fensterreinigung — ${name}`,
      text:
        `Name: ${name}\n` +
        `E-Mail: ${email}\n` +
        `Telefon: ${telefon}\n` +
        (kunde ? `Kunde: ${kunde}\n` : "") +
        `Adresse: ${strasse}, ${plz ? plz + " " : ""}${ort}\n` +
        (wunschtermin || wunschzeit
          ? `Wunschtermin: ${[wunschtermin, wunschzeit]
              .filter(Boolean)
              .join(" ")}\n`
          : "") +
        `\nNachricht:\n${nachricht}\n`,
    });

    return redirect("/danke", 303);
  } catch (err) {
    console.error("MAIL_ERROR", err);
    return new Response("Server Error", { status: 500 });
  }
};
