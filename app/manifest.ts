import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Mind Online",
    short_name: "The Mind",
    description:
      "Play The Mind online in your browser with a focused multiplayer lobby experience.",
    start_url: "/",
    display: "standalone",
    background_color: "#071018",
    theme_color: "#0f2230",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
