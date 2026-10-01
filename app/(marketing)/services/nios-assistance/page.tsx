import { ContentPage } from "@/src/components/content-page";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappMessages } from "@/src/lib/whatsapp";
export const metadata = pageMetadata({ title: "NIOS Assistance", description: "Structured guidance on the NIOS step towards your aviation goals: the route, the documents and timely answers on WhatsApp.", path: "/services/nios-assistance" });
export default function Page() { return <ContentPage eyebrow="Service / Education" title={<>Build the base<br /><em>for takeoff.</em></>} intro="Get structured guidance on the NIOS step as you work toward your aviation goals." sections={[{ title: "See the route", text: "Break a confusing education requirement into clear, manageable steps." }, { title: "Know your documents", text: "Prepare the information and paperwork needed for the next stage of your plan." }, { title: "Keep moving", text: "Use practical support and timely answers to avoid losing momentum." }]} actions={<WhatsAppCta message={whatsappMessages.nios} label="Get NIOS Assistance" />} />; }
