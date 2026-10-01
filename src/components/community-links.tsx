import { siteConfig } from "@/src/lib/site-config";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

export function CommunityLinks({ whatsappLabel = "Join our WhatsApp Community", className }: { whatsappLabel?: string; className?: string }) {
  // Until the community invite link is configured, fall back to a direct chat.
  const whatsappHref = siteConfig.whatsappCommunityUrl || whatsappLink(whatsappMessages.community);

  return (
    <div className={className ? `community-links ${className}` : "community-links"}>
      <a className="button button-primary" href={whatsappHref} target="_blank" rel="noreferrer">
        {whatsappLabel} <span aria-hidden="true">↗</span>
      </a>
      {siteConfig.telegramUrl ? (
        <a className="button button-ghost" href={siteConfig.telegramUrl} target="_blank" rel="noreferrer">
          Join our Telegram Community <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
