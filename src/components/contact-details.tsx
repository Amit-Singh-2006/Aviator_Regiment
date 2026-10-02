import { formatPhone } from "@/src/lib/format";
import { siteConfig } from "@/src/lib/site-config";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

// The business contact details from the environment (see .env.example), for the
// Contact page and the policies. Unset details are left out.
export function ContactDetails() {
  return <ul>
    {siteConfig.supportEmail && <li>Email: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a></li>}
    {siteConfig.supportPhone && <li>Phone: <a href={`tel:+${siteConfig.supportPhone}`}>{formatPhone(siteConfig.supportPhone)}</a></li>}
    {siteConfig.whatsappNumber && <li>WhatsApp: <a href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">{formatPhone(siteConfig.whatsappNumber)}</a></li>}
    {siteConfig.businessAddress && <li>Address: {siteConfig.businessAddress}</li>}
  </ul>;
}
