"use client";

import { useMemo, useState } from "react";
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
      <p className="mt-4 rounded-xl border border-[#f1ba6a55] bg-[#f1ba6a11] px-4 py-3 text-sm text-[#ffdcae]">
        Submitted! Your run is pending review before it appears on the leaderboard.
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-[#f1ba6a55] bg-[#f1ba6a11] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(teamName.trim(), countryCode);
      }}
    >
      <p className="text-sm text-[#f2c98f]">
        Add your run to the leaderboard: {formatSeconds(eligibility.finalSeconds)}
        {" "}({eligibility.playerCount} players, {eligibility.livesLostCount} lives lost,{" "}
        {eligibility.shurikensUsedCount} shurikens used).
      </p>

      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Team name</span>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={MAX_TEAM_NAME_LENGTH}
          placeholder="e.g. The Mind Readers"
          disabled={isSubmitting}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text-strong)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-60"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Country</span>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text-strong)] outline-none transition focus:border-[var(--accent)] disabled:opacity-60"
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

      {error ? <p className="text-sm text-[#ff8f8f]">Error: {error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-11 w-full rounded-xl border border-[#f1ba6a88] bg-[#f1ba6a22] px-4 py-2.5 text-sm font-medium text-[#ffdcae] transition hover:bg-[#f1ba6a33] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Submitting..." : "Submit to leaderboard"}
      </button>
    </form>
  );
}
