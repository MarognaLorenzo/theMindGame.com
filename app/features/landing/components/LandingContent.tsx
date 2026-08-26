import Link from "next/link";
import { LandingIllustration } from "./LandingIllustration";

export function LandingContent() {
  return (
    <>
      <div className="mt-3 text-sm text-[var(--text-muted)]">
        Learn the game flow on the {" "}
        <Link
          href="/rules"
          className="text-[var(--text-strong)] underline decoration-[#8fd8d7] underline-offset-2"
        >
          rules page
        </Link>
        .
      </div>

      <LandingIllustration />

      <section className="mt-8 grid gap-4 text-sm text-[var(--text-muted)] sm:grid-cols-2">
        <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            How To Play Online
          </h2>
          <p className="mt-2 leading-relaxed">
            Create a lobby, share the code, and start when everyone joins. Your team must play cards in ascending order without revealing values.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Rules Summary
          </h2>
          <p className="mt-2 leading-relaxed">
            Wrong timing costs shared lives. Shurikens help clear low cards in difficult rounds. Win by clearing all levels together.
          </p>
        </article>
      </section>
    </>
  );
}
