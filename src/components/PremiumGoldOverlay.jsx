import { buildKiwifyUpgradeUrl } from "../services/planAccess.js";

const DEFAULT_VIDEO =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

const COPY =
  "Quer ir mais fundo na sua caminhada de fé e intimidade com Deus? As Jornadas Temáticas foram desenhadas para momentos em que você precisa de respostas claras, direcionamento espiritual intenso e quebra de barreiras. Ative o seu Nível Ouro hoje por apenas mais R$ 33,00 e destrave: Jornadas Temáticas Intensas, Protocolos Práticos de Jejum Bíblico Guiado, Campanhas e Propósitos semanais, e Ferramenta de download de imagens.";

export function PremiumGoldOverlay({ userEmail, title, videoSrc = DEFAULT_VIDEO, children }) {
  const upgradeUrl = buildKiwifyUpgradeUrl(userEmail);

  const openCheckout = () => {
    if (!upgradeUrl) {
      window.alert("Link de upgrade não configurado. Defina VITE_KIWIFY_UPGRADE_URL.");
      return;
    }
    window.open(upgradeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="premium-lock">
      <div className="premium-lock-video-wrap">
        <video
          className="premium-lock-video"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
        />
        <div className="premium-lock-video-shade" />
      </div>
      <div className="premium-lock-body">
        {title ? <h3 className="premium-lock-title">{title}</h3> : null}
        <p className="premium-lock-copy">{COPY}</p>
        <button type="button" className="premium-lock-cta" onClick={openCheckout}>
          Quero Ativar Meu Nível Ouro Agora
        </button>
        {children}
      </div>
    </div>
  );
}
