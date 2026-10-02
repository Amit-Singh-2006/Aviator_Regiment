// Search text is limited to characters that are safe inside a PostgREST filter.
export function cleanNewsSearch(value: string | undefined) {
  return (value ?? "").replace(/[^\p{L}\p{N} .'\-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}
