import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

export function WhatsAppCta({ message = whatsappMessages.general, label = "Chat on WhatsApp" }: { message?: string; label?: string }) {
  return <a className="button button-primary" href={whatsappLink(message)} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>;
}
