export type Career = {
  slug: string;
  name: string;
  summary: string;
  // Completes "I would like guidance on …" in the WhatsApp enquiry.
  enquiry: string;
};

export const careers: Career[] = [
  {
    slug: "commercial-pilot",
    name: "Commercial Pilot",
    summary: "Fly passengers and cargo for airlines and charter operators with a DGCA Commercial Pilot Licence (CPL).",
    enquiry: "becoming a commercial pilot",
  },
  {
    slug: "private-pilot",
    name: "Private Pilot",
    summary: "Fly for personal and recreational purposes with a Private Pilot Licence (PPL).",
    enquiry: "getting a private pilot licence",
  },
  {
    slug: "flight-instructor",
    name: "Flight Instructor",
    summary: "Train the next generation of pilots at flying training organisations by adding an instructor rating to your licence.",
    enquiry: "becoming a flight instructor",
  },
  {
    slug: "airline-careers",
    name: "Airline Careers",
    summary: "Explore the airline world beyond the flight deck, from operations and planning to customer service and management.",
    enquiry: "airline careers",
  },
  {
    slug: "defence-aviation",
    name: "Defence Aviation",
    summary: "Fly and serve with the Indian Air Force, Indian Navy, Indian Army or Indian Coast Guard through the defence selection process.",
    enquiry: "a career in defence aviation",
  },
  {
    slug: "cabin-crew",
    name: "Cabin Crew",
    summary: "Look after passenger safety and comfort on board as part of an airline's cabin crew team.",
    enquiry: "becoming cabin crew",
  },
  {
    slug: "aircraft-maintenance-engineering",
    name: "Aircraft Maintenance / Engineering",
    summary: "Keep aircraft safe and airworthy as a licensed Aircraft Maintenance Engineer (AME) or aviation technician.",
    enquiry: "a career in aircraft maintenance engineering",
  },
  {
    slug: "atc",
    name: "Air Traffic Control (ATC)",
    summary: "Keep aircraft safely separated and traffic flowing, in the air and on the ground, as an air traffic controller.",
    enquiry: "becoming an air traffic controller",
  },
  {
    slug: "ground-operations",
    name: "Ground Operations",
    summary: "Keep flights moving on the ground, from ramp and baggage handling to passenger services and aircraft turnaround.",
    enquiry: "a career in ground operations",
  },
  {
    slug: "other-aviation-careers",
    name: "Other Aviation Careers",
    summary: "Discover more ways to build a life in aviation, from airport management and aviation safety to drone operations.",
    enquiry: "other aviation careers",
  },
];

export function findCareer(slug: string) {
  return careers.find((career) => career.slug === slug);
}

// Avoids titles like "Airline Careers Career Guide".
export function careerGuideTitle(career: Career) {
  return career.name.endsWith("Careers") ? `${career.name} Guide` : `${career.name} Career Guide`;
}
