const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Jornada com Deus <noreply@jornadacomdeus.com.br>";

export async function sendWelcomeAccessEmail({ email, name, tempPassword, loginUrl }) {
  const appUrl = loginUrl || process.env.APP_URL || "http://localhost:5173";
  const subject = "Bem-vinda à Jornada com Deus — seu acesso está pronto";
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a2e">
      <p>Olá, <strong>${escapeHtml(name)}</strong>!</p>
      <p>Sua compra foi confirmada. Você já pode acessar o devocional diário no app.</p>
      <p><strong>E-mail:</strong> ${escapeHtml(email)}<br/>
      <strong>Senha temporária:</strong> <code>${escapeHtml(tempPassword)}</code></p>
      <p>Recomendamos alterar a senha no primeiro acesso.</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(appUrl)}" style="background:linear-gradient(135deg,#c9a96e,#a07840);color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:bold">
          Acessar Jornada com Deus
        </a>
      </p>
      <p style="font-size:12px;color:#666">Se o botão não abrir, copie este link: ${escapeHtml(appUrl)}</p>
    </div>
  `;

  return sendTransactionalEmail({ to: email, subject, html });
}

async function sendTransactionalEmail({ to, subject, html }) {
  if (!to) return { ok: false, skipped: true, reason: "missing_recipient" };

  if (!RESEND_API_KEY) {
    console.log("[email:welcome]", { to, subject, preview: "RESEND_API_KEY ausente — e-mail logado no console" });
    return { ok: true, dryRun: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail: ${JSON.stringify(data)}`);
  }
  return { ok: true, id: data?.id };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
