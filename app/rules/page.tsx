import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rules",
  description:
    "Read the rules of The Mind and learn how to play this cooperative card game online with your friends.",
  alternates: {
    canonical: "/rules",
  },
  openGraph: {
    title: "The Mind Online Rules",
    description:
      "Learn how to play The Mind online, including core rules, lives, shurikens, and win conditions.",
    url: "https://the-mind-game.com/rules",
    images: ["/og-image.svg"],
  },
};

export default function RulesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 text-stone-100 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-4xl">
        The Mind Rules Online
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
        The Mind is a cooperative card game where players must play cards in ascending order without discussing exact numbers.
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--text-muted)]">
        <article>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Setup</h2>
          <p className="mt-2">
            Each player joins a lobby and receives cards equal to the current level number. Cards stay hidden from other players.
          </p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Round Objective</h2>
          <p className="mt-2">
            Play all cards from lowest to highest across all players. No turns are assigned. Players choose their moment based on rhythm and timing.
          </p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Lives And Mistakes</h2>
          <p className="mt-2">
            If a higher card is played before a lower one, the team loses a life. Team mates with lower cards than the played card discard those cards.
          </p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Shurikens</h2>
          <p className="mt-2">
            Shurikens are limited shared tools. Using one makes every player discard their lowest card. Save them for difficult levels.
          </p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Win And Loss</h2>
          <p className="mt-2">
            You win by clearing all levels for your lobby size. You lose when the team has no lives left.
          </p>
        </article>
      </section>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        Ready to play? Return to the {" "}
        <Link
          href="/"
          className="text-[var(--text-strong)] underline decoration-[#8fd8d7] underline-offset-2"
        >
          main game page
        </Link>
        .
      </p>
    </main>
  );
}
