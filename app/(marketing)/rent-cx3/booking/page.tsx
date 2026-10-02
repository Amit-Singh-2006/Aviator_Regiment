import { BookingForm } from "@/src/components/booking-form";
import { isRazorpayConfigured } from "@/src/lib/razorpay/server";
import { pageMetadata } from "@/src/lib/seo";
import { findSession } from "@/src/modules/exam-sessions/queries";

export const metadata = pageMetadata({
  title: "Book your CX-3",
  description: "Book a CX-3 for your DGCA examination session with Aviator's Regiment.",
  path: "/rent-cx3/booking",
  noIndex: true,
});

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session: sessionId } = await searchParams;
  const session = sessionId ? await findSession(sessionId) : null;
  return <main className="booking-page"><BookingForm session={session} onlinePayments={isRazorpayConfigured()} /></main>;
}
