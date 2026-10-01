import { Bricolage_Grotesque, Cinzel, Cormorant_Garamond, DM_Serif_Display, Oswald, Playfair_Display, Space_Grotesk } from "next/font/google";

// One display font per homepage section headline. They sit below the fold, so
// they are not preloaded and only download when their section is rendered.
// next/font requires each loader call to be assigned to its own module-level const.
const cinzel = Cinzel({ subsets: ["latin"], weight: "700", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: "700", display: "swap", preload: false });
const oswald = Oswald({ subsets: ["latin"], weight: "600", display: "swap", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: "700", display: "swap", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: "800", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: "700", display: "swap", preload: false });

export const sectionFonts = { cinzel, playfair, oswald, dmSerif, spaceGrotesk, bricolage, cormorant };

export type SectionFont = keyof typeof sectionFonts;
