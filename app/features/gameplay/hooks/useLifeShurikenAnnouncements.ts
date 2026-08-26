"use client";

import { useEffect, useRef, useState } from "react";

interface LevelCompletionAnnouncement {
  completedLevel: number;
  gainedLives: number;
  gainedShurikens: number;
}

interface LifeLossAnnouncement {
  lostLives: number;
}

// Tracks lives/shurikens/level changes between renders and turns them into the tick counters
// and transient announcements PlayingView uses to trigger its gain/loss/level-complete animations.
export function useLifeShurikenAnnouncements(lives: number, shurikens: number, currentLevel: number) {
  const previousLivesRef = useRef(lives);
  const previousShurikensRef = useRef(shurikens);
  const previousLevelRef = useRef(currentLevel);
  const levelOverlayTimeoutRef = useRef<number | undefined>(undefined);
  const lifeLossOverlayTimeoutRef = useRef<number | undefined>(undefined);
  const [lifeGainTick, setLifeGainTick] = useState(0);
  const [lifeLossTick, setLifeLossTick] = useState(0);
  const [shurikenGainTick, setShurikenGainTick] = useState(0);
  const [levelCompleteTick, setLevelCompleteTick] = useState(0);
  const [lifeLossOverlayTick, setLifeLossOverlayTick] = useState(0);
  const [completedLevelAnnouncement, setCompletedLevelAnnouncement] =
    useState<LevelCompletionAnnouncement | null>(null);
  const [lifeLossAnnouncement, setLifeLossAnnouncement] = useState<LifeLossAnnouncement | null>(null);
  const [lastLifeEvent, setLastLifeEvent] = useState<"gain" | "loss" | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (currentLevel > previousLevelRef.current) {
      const completedLevel = Math.max(1, currentLevel - 1);
      const gainedLives = Math.max(0, lives - previousLivesRef.current);
      const gainedShurikens = Math.max(0, shurikens - previousShurikensRef.current);

      timeoutId = window.setTimeout(() => {
        setLevelCompleteTick((tick) => tick + 1);
        setCompletedLevelAnnouncement({
          completedLevel,
          gainedLives,
          gainedShurikens,
        });
      }, 0);

      if (levelOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(levelOverlayTimeoutRef.current);
      }

      levelOverlayTimeoutRef.current = window.setTimeout(() => {
        setCompletedLevelAnnouncement(null);
      }, 2500);
    }

    previousLevelRef.current = currentLevel;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentLevel, lives, shurikens]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (lives > previousLivesRef.current) {
      timeoutId = window.setTimeout(() => {
        setLifeGainTick((tick) => tick + 1);
        setLastLifeEvent("gain");
      }, 0);
    } else if (lives < previousLivesRef.current) {
      const lostLives = Math.max(1, previousLivesRef.current - lives);
      timeoutId = window.setTimeout(() => {
        setLifeLossTick((tick) => tick + 1);
        setLastLifeEvent("loss");
        setLifeLossOverlayTick((tick) => tick + 1);
        setLifeLossAnnouncement({ lostLives });
      }, 0);

      if (lifeLossOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(lifeLossOverlayTimeoutRef.current);
      }

      lifeLossOverlayTimeoutRef.current = window.setTimeout(() => {
        setLifeLossAnnouncement(null);
      }, 2500);
    }
    previousLivesRef.current = lives;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lives]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (shurikens > previousShurikensRef.current) {
      timeoutId = window.setTimeout(() => {
        setShurikenGainTick((tick) => tick + 1);
      }, 0);
    }
    previousShurikensRef.current = shurikens;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [shurikens]);

  useEffect(() => {
    return () => {
      if (levelOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(levelOverlayTimeoutRef.current);
      }
      if (lifeLossOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(lifeLossOverlayTimeoutRef.current);
      }
    };
  }, []);

  return {
    lifeGainTick,
    lifeLossTick,
    shurikenGainTick,
    levelCompleteTick,
    lifeLossOverlayTick,
    completedLevelAnnouncement,
    lifeLossAnnouncement,
    lastLifeEvent,
  };
}
