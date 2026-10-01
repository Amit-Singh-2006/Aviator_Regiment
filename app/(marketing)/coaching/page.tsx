import { ContentPage } from "@/src/components/content-page";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappMessages } from "@/src/lib/whatsapp";
export const metadata = pageMetadata({ title: "Aviation Coaching", description: "Coaching for aviation learners and DGCA exam preparation with a structured, confident approach. Enquire on WhatsApp.", path: "/coaching" });
export default function Page() { return <ContentPage eyebrow="Learning / Coaching" title={<>Train your focus.<br /><em>Raise your ceiling.</em></>} intro="Coaching support for aviation learners who want a more structured, confident approach to their preparation." sections={[{ title: "Structured learning", text: "Turn a broad goal into a plan with milestones, revision and accountability." }, { title: "Concepts that stick", text: "Focus on understanding rather than memorising disconnected answers." }, { title: "Aviation mindset", text: "Build the discipline and confidence that support a long-term career in aviation." }]} actions={<WhatsAppCta message={whatsappMessages.coaching} label="Enquire about Coaching" />} />; }
