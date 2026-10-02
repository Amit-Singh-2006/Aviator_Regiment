// Client-safe helpers for the careers directory (public.career_roles and
// public.career_companies).

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

// Avoids titles like "Airline Careers Career Guide".
export function careerPageTitle(name: string) {
  return name.endsWith("Careers") ? `${name} Guide` : `${name} Career Guide`;
}
