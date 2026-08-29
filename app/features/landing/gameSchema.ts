import { SITE_URL } from "../../lib/site";

export const gameSchema = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "The Mind Online",
  url: SITE_URL,
  description:
    "Play The Mind online in your browser with a focused multiplayer lobby experience.",
  genre: ["Card Game", "Cooperative Game", "Multiplayer"],
  playMode: "MultiPlayer",
  applicationCategory: "Game",
  inLanguage: "en",
  author: {
    "@type": "Person",
    name: "Wolfgang Warsch",
  },
  publisher: {
    "@type": "Organization",
    name: "The Mind Online",
  },
};
