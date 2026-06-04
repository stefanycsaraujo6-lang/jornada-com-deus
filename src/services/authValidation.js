const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmailInput(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  const normalized = normalizeEmailInput(email);
  if (!normalized || normalized.length > 254) return false;
  return EMAIL_RE.test(normalized);
}

export function isValidPassword(password) {
  const value = String(password || "");
  return value.length >= 6 && value.length <= 128;
}

export function validateLoginCredentials(email, password) {
  const normalized = normalizeEmailInput(email);
  if (!normalized) {
    return { ok: false, field: "email", message: "Informe seu e-mail." };
  }
  if (!isValidEmail(normalized)) {
    return { ok: false, field: "email", message: "Informe um e-mail válido (ex.: nome@provedor.com)." };
  }
  if (!String(password || "").trim()) {
    return { ok: false, field: "password", message: "Informe sua senha." };
  }
  if (!isValidPassword(password)) {
    return { ok: false, field: "password", message: "A senha deve ter pelo menos 6 caracteres." };
  }
  return { ok: true, email: normalized };
}

export function registrationBlockMessage(reason) {
  switch (reason) {
    case "invalid_email":
      return "Informe um e-mail válido.";
    case "not_registered":
      return "Este e-mail não está cadastrado. Faça sua compra na Kiwify para receber o acesso.";
    case "pending_activation":
      return "Compra detectada, mas o acesso ainda não foi liberado. Aguarde o e-mail com sua senha.";
    case "inactive":
      return "Seu acesso está inativo. Verifique sua assinatura na Kiwify.";
    default:
      return "Não foi possível validar o acesso.";
  }
}
