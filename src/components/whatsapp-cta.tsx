import Link from "next/link";

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999";

export function WhatsAppCta({ message = "Hello Aviator's Regiment, I would like to know more about your aviation services." }: { message?: string }) {
  const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  return <Link className="button button-primary" href={href} target="_blank" rel="noreferrer">Chat on WhatsApp <span>↗</span></Link>;
}
