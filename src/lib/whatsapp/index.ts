import { siteConfig } from "@/src/lib/site-config";

// Pre-filled WhatsApp messages, kept in one place so the copy is easy to update.
export const whatsappMessages = {
  general: "Hi Aviator's Regiment, I would like to know more about your aviation services.",
  services: "Hi Aviator's Regiment, I would like help choosing an aviation service.",
  rentOutCx3: "Hi Aviator's Regiment, I am interested in renting out my CX-3.",
  computerNumber: "Hi Aviator's Regiment, I need assistance with my DGCA Computer Number application.",
  medical: "Hi Aviator's Regiment, I need assistance with my Class 1/Class 2 aviation medical.",
  nios: "Hi Aviator's Regiment, I need assistance with NIOS.",
  coaching: "Hi Aviator's Regiment, I would like to know more about your coaching classes.",
  community: "Hi Aviator's Regiment, I would like to join the Aviator's Regiment community.",
  sessionUpdates: "Hi Aviator's Regiment, please let me know when the next CX-3 rental sessions open.",
  career: (topic: string) => `Hi Aviator's Regiment, I would like guidance on ${topic}.`,
  upiPayment: (bookingId: string, sessionName: string, amount: string) =>
    `Hi Aviator's Regiment, my Booking ID is ${bookingId}. I have completed the UPI payment of ${amount} for ${sessionName}. Sharing my payment screenshot here.`,
  bookingUpdate: (bookingId: string) => `Hi Aviator's Regiment, I would like an update on my booking ${bookingId}.`,
};

export function whatsappLink(message: string) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
