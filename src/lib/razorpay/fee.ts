// Razorpay's standard fee is 2% of the amount charged plus 18% GST on that fee
// (2.36% in total). Online payments add it on top of the rental, so the full rental
// still reaches Aviator's Regiment. Change this if the Razorpay plan changes.
export const RAZORPAY_FEE_RATE = 0.0236;

// The amount charged online for a rental, and the gateway fee included in it.
export function onlinePaymentAmount(rentalInr: number) {
  const totalInr = Math.ceil(rentalInr / (1 - RAZORPAY_FEE_RATE));
  return { totalInr, feeInr: totalInr - rentalInr };
}
