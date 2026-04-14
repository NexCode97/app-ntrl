import nodemailer from "nodemailer";

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "NTRL"}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}
