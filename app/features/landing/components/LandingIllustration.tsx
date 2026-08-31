export function LandingIllustration() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(160deg,#112033_0%,#132535_45%,#192d2f_100%)] p-5 shadow-[0_12px_40px_rgba(2,6,10,0.45)] sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#9be8ff1f] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-[#7ce4c029] blur-2xl" />

      <div className="relative z-10 grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Silent Cooperative Card Game
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-3xl">
            Read The Table, Not The Numbers.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[0.95rem]">
            Every player sees only their own hand. The whole team has to feel the same rhythm.
          </p>
        </div>

        <div className="rounded-xl border border-[#bad8d53a] bg-[#08131dcc] p-3">
          <svg viewBox="0 0 420 240" role="img" aria-label="Stylized illustration of cards being played in sequence" className="h-auto w-full">
            <defs>
              <linearGradient id="tableGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#53a7c2" stopOpacity="0.36" />
                <stop offset="100%" stopColor="#7ce4c0" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="cardSurface" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fffef8" />
                <stop offset="100%" stopColor="#eee4cf" />
              </linearGradient>
            </defs>

            <ellipse cx="210" cy="170" rx="180" ry="45" fill="url(#tableGlow)" />

            <g>
              <rect x="60" y="56" width="84" height="124" rx="14" fill="url(#cardSurface)" transform="rotate(-11 102 118)" />
              <text x="102" y="126" textAnchor="middle" fill="#24313a" fontSize="34" fontWeight="700" transform="rotate(-11 102 118)">
                9
              </text>
            </g>

            <g>
              <rect x="164" y="42" width="92" height="132" rx="14" fill="url(#cardSurface)" />
              <text x="210" y="116" textAnchor="middle" fill="#24313a" fontSize="37" fontWeight="700">
                24
              </text>
            </g>

            <g>
              <rect x="278" y="56" width="84" height="124" rx="14" fill="url(#cardSurface)" transform="rotate(10 320 118)" />
              <text x="320" y="126" textAnchor="middle" fill="#24313a" fontSize="34" fontWeight="700" transform="rotate(10 320 118)">
                36
              </text>
            </g>

            <path d="M96 198 C144 176, 170 182, 210 160 C246 140, 270 152, 318 132" fill="none" stroke="#9be8d6" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />

            <circle cx="96" cy="198" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="210" cy="160" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="318" cy="132" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      </div>
    </section>
  );
}
