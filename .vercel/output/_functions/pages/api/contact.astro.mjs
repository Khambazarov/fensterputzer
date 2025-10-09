import * as nodemailer from 'nodemailer';
export { renderers } from '../../renderers.mjs';

const prerender = false;
function isEmail(x) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
const POST = async ({ request, redirect }) => {
  try {
    const fd = await request.formData();
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      // z.B. smtp.ionos.de
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        // z.B. kontakt@deine-domain.de
        pass: process.env.SMTP_PASS
      }
    });
    const MAIL_FROM = String(process.env.MAIL_FROM);
    const MAIL_TO = String(process.env.MAIL_TO || process.env.MAIL_FROM);
    await transporter.sendMail({
      from: `"Webformular" <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `Neue Anfrage Fensterreinigung — ${name}`,
      text: `Name: ${name}
E-Mail: ${email}
` + (telefon ? `Telefon: ${telefon}
` : "") + (kunde ? `Kunde: ${kunde}
` : "") + (ort ? `Ort/PLZ: ${ort}
` : "") + `
Nachricht:
${nachricht}
`
    });
    return redirect("/danke", 303);
  } catch (err) {
    console.error("MAIL_ERROR", err);
    return new Response("Server Error", { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
