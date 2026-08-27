"use client";

import { useMemo, useState } from "react";
import { HeartIcon, ShurikenIcon } from "../../gameplay/components/icons";
import type { LeaderboardEligibility } from "../../lobby/types";
import type { LeaderboardSubmitStatus } from "../../lobby/hooks/useLobbyClient";
import { getCountryOptions } from "../lib/countries";

const MAX_TEAM_NAME_LENGTH = 30;

interface LeaderboardSubmitFormProps {
  eligibility: LeaderboardEligibility;
  status: LeaderboardSubmitStatus;
  error: string;
  onSubmit: (teamName: string, countryCode: string) => void;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

const CARD_CLASSNAME =
  "game-result-enter relative mt-5 overflow-hidden rounded-2xl border border-[#f1ba6a88] bg-gradient-to-br from-[#3e2b14] via-[#2e4b35] to-[#27464e] p-6 text-center shadow-[0_20px_48px_rgba(241,186,106,0.2)]";

export function LeaderboardSubmitForm({
  eligibility,
  status,
  error,
  onSubmit,
}: LeaderboardSubmitFormProps) {
  const [teamName, setTeamName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const countryOptions = useMemo(() => getCountryOptions(), []);

  const isSubmitting = status === "submitting";
  const canSubmit = teamName.trim().length > 0 && countryCode !== "" && !isSubmitting;

  if (status === "submitted") {
    return (
      <div className={CARD_CLASSNAME}>
        <span className="result-particle result-particle-a" aria-hidden="true" />
        <span className="result-particle result-particle-b" aria-hidden="true" />
        <p className="text-4xl">🎉</p>
        <p className="game-result-title-pop mt-2 text-xl font-extrabold uppercase tracking-wide text-[#ffdcae]">
          Submitted!
        </p>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#f2c98f]">
          Your team name is now under review by a real human before it goes live -
          just making sure the leaderboard stays a safe, welcoming space for everyone.
        </p>
      </div>
    );
  }

  return (
    <form
      className={`${CARD_CLASSNAME} space-y-4 text-left sm:p-7`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(teamName.trim(), countryCode);
      }}
    >
      <span className="result-particle result-particle-a" aria-hidden="true" />
      <span className="result-particle result-particle-b" aria-hidden="true" />

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f2c98f]">
          🏆 You&apos;re leaderboard-eligible!
        </p>
        <p className="game-result-title-pop mt-2 text-4xl font-black text-[#ffdcae] [text-shadow:0_0_18px_rgba(255,224,122,0.4)] sm:text-5xl">
          {formatSeconds(eligibility.finalSeconds)}
        </p>
        <div className="mt-2 flex items-center justify-center gap-3 text-sm font-medium text-[#f2c98f]">
          <span>{eligibility.playerCount} players</span>
          {eligibility.livesLostCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[#ff8f8f]">
              <HeartIcon className="h-4 w-4" /> {eligibility.livesLostCount}
            </span>
          ) : null}
          {eligibility.shurikensUsedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[var(--accent)]">
              <ShurikenIcon className="h-4 w-4" /> {eligibility.shurikensUsedCount}
            </span>
          ) : null}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#f2c98f]">Team name</span>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={MAX_TEAM_NAME_LENGTH}
          placeholder="e.g. The Mind Readers"
          disabled={isSubmitting}
          autoFocus
          className="w-full rounded-2xl border-2 border-[#f1ba6a55] bg-[#00000033] px-4 py-3.5 text-lg font-semibold text-[#fff7ea] outline-none transition placeholder:font-normal placeholder:text-[#f2c98f77] focus:border-[#f1ba6a] focus:shadow-[0_0_0_4px_rgba(241,186,106,0.18)] disabled:opacity-60"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#f2c98f]">Country</span>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-2xl border-2 border-[#f1ba6a55] bg-[#00000033] px-4 py-3.5 text-lg font-semibold text-[#fff7ea] outline-none transition focus:border-[#f1ba6a] focus:shadow-[0_0_0_4px_rgba(241,186,106,0.18)] disabled:opacity-60"
        >
          <option value="" disabled>
            Select a country
          </option>
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-center text-sm text-[#ff8f8f]">Error: {error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-2xl bg-gradient-to-r from-[#f1ba6a] to-[#ffdcae] px-6 py-4 text-lg font-extrabold uppercase tracking-wide text-[#3e2b14] shadow-[0_10px_24px_rgba(241,186,106,0.35)] transition hover:brightness-110 hover:shadow-[0_14px_32px_rgba(241,186,106,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {isSubmitting ? "Submitting..." : "🏆 Claim Your Spot"}
      </button>
    </form>
  );
}
