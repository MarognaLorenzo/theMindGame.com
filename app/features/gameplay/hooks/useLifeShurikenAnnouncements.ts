"use client";

import { useEffect, useReducer, useRef } from "react";

interface LevelCompletionAnnouncement {
  completedLevel: number;
  gainedLives: number;
  gainedShurikens: number;
}

interface LifeLossAnnouncement {
  lostLives: number;
}

interface AnnouncementsState {
  lifeGainTick: number;
  lifeLossTick: number;
  shurikenGainTick: number;
  levelCompleteTick: number;
  lifeLossOverlayTick: number;
  lastLifeEvent: "gain" | "loss" | null;
  completedLevelAnnouncement: LevelCompletionAnnouncement | null;
  lifeLossAnnouncement: LifeLossAnnouncement | null;
}

type AnnouncementAction =
  | { type: "LIFE_GAINED" }
  | { type: "LIFE_LOST"; lostLives: number }
  | { type: "SHURIKEN_GAINED" }
  | { type: "LEVEL_COMPLETED"; completedLevel: number; gainedLives: number; gainedShurikens: number }
  | { type: "CLEAR_LEVEL_ANNOUNCEMENT" }
  | { type: "CLEAR_LIFE_LOSS_ANNOUNCEMENT" };

const initialState: AnnouncementsState = {
  lifeGainTick: 0,
  lifeLossTick: 0,
  shurikenGainTick: 0,
  levelCompleteTick: 0,
  lifeLossOverlayTick: 0,
  lastLifeEvent: null,
  completedLevelAnnouncement: null,
  lifeLossAnnouncement: null,
};

function reducer(state: AnnouncementsState, action: AnnouncementAction): AnnouncementsState {
  switch (action.type) {
    case "LIFE_GAINED":
      return { ...state, lifeGainTick: state.lifeGainTick + 1, lastLifeEvent: "gain" };
    case "LIFE_LOST":
      return {
        ...state,
        lifeLossTick: state.lifeLossTick + 1,
        lifeLossOverlayTick: state.lifeLossOverlayTick + 1,
        lastLifeEvent: "loss",
        lifeLossAnnouncement: { lostLives: action.lostLives },
      };
    case "SHURIKEN_GAINED":
      return { ...state, shurikenGainTick: state.shurikenGainTick + 1 };
    case "LEVEL_COMPLETED":
      return {
        ...state,
        levelCompleteTick: state.levelCompleteTick + 1,
        completedLevelAnnouncement: {
          completedLevel: action.completedLevel,
          gainedLives: action.gainedLives,
          gainedShurikens: action.gainedShurikens,
        },
      };
    case "CLEAR_LEVEL_ANNOUNCEMENT":
      return { ...state, completedLevelAnnouncement: null };
    case "CLEAR_LIFE_LOSS_ANNOUNCEMENT":
      return { ...state, lifeLossAnnouncement: null };
    default:
      return state;
  }
}

// The overlay CSS animations (globals.css: `.level-complete-card`, `.life-loss-card`) run for
// 2.35s. Clearing the announcement a beat after that lets the fade-out finish before the element
// unmounts, instead of cutting the animation off mid-way.
const ANNOUNCEMENT_CLEAR_MS = 2500;

// Tracks lives/shurikens/level changes between renders and turns them into the tick counters
// and transient announcements PlayingView uses to trigger its gain/loss/level-complete animations.
export function useLifeShurikenAnnouncements(lives: number, shurikens: number, currentLevel: number) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const previousLivesRef = useRef(lives);
  const previousShurikensRef = useRef(shurikens);
  const previousLevelRef = useRef(currentLevel);

  useEffect(() => {
    if (currentLevel > previousLevelRef.current) {
      dispatch({
        type: "LEVEL_COMPLETED",
        completedLevel: Math.max(1, currentLevel - 1),
        gainedLives: Math.max(0, lives - previousLivesRef.current),
        gainedShurikens: Math.max(0, shurikens - previousShurikensRef.current),
      });
    }
    previousLevelRef.current = currentLevel;
    // `lives`/`shurikens` are read for their value *at the moment currentLevel changes*, not
    // watched independently - re-running this effect when only they change would be a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel]);

  useEffect(() => {
    if (lives > previousLivesRef.current) {
      dispatch({ type: "LIFE_GAINED" });
    } else if (lives < previousLivesRef.current) {
      dispatch({ type: "LIFE_LOST", lostLives: Math.max(1, previousLivesRef.current - lives) });
    }
    previousLivesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    if (shurikens > previousShurikensRef.current) {
      dispatch({ type: "SHURIKEN_GAINED" });
    }
    previousShurikensRef.current = shurikens;
  }, [shurikens]);

  // Auto-clear each announcement a beat after its CSS animation finishes. If the same kind of
  // announcement fires again before that (another level completes, another wrong card is
  // played), this effect's cleanup cancels the stale timer and re-arms a fresh one - the same
  // "clear the old timeout before starting a new one" behavior the previous version did by hand
  // with a ref, but handled by React instead of manually.
  useEffect(() => {
    if (!state.completedLevelAnnouncement) return;
    const id = window.setTimeout(() => dispatch({ type: "CLEAR_LEVEL_ANNOUNCEMENT" }), ANNOUNCEMENT_CLEAR_MS);
    return () => window.clearTimeout(id);
  }, [state.completedLevelAnnouncement]);

  useEffect(() => {
    if (!state.lifeLossAnnouncement) return;
    const id = window.setTimeout(() => dispatch({ type: "CLEAR_LIFE_LOSS_ANNOUNCEMENT" }), ANNOUNCEMENT_CLEAR_MS);
    return () => window.clearTimeout(id);
  }, [state.lifeLossAnnouncement]);

  return state;
}
