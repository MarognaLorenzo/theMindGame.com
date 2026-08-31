import Link from "next/link";
import { LandingIllustration } from "./LandingIllustration";

export function LandingContent() {
  return (
    <>
      <LandingIllustration />

      <section className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
        <h2 className="text-base font-semibold text-[var(--text-strong)]">
          What else to know
        </h2>
        <p className="mt-2">
          Playing a card out of order costs the team a shared life. Shurikens are
          a shared resource that make everyone discard their lowest card &mdash;
          save them for tight rounds. Clear every level together to win.
        </p>
        <Link
          href="/rules"
          className="mt-3 inline-block text-[var(--text-strong)] underline decoration-[#8fd8d7] underline-offset-2"
        >
          Full rules &rsaquo;
        </Link>
      </section>
    </>
  );
}
