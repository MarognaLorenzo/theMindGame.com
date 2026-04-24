import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://the-mind-game.com"),
  title: {
    default: "The Mind Online",
    template: "%s | The Mind Online",
  },
  description:
    "Play The Mind online in your browser with a focused multiplayer lobby experience.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://the-mind-game.com",
    title: "The Mind Online",
    description:
      "Play The Mind online in your browser with a focused multiplayer lobby experience.",
    siteName: "The Mind Online",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "The Mind Online card game preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Mind Online",
    description:
      "Play The Mind online in your browser with a focused multiplayer lobby experience.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
