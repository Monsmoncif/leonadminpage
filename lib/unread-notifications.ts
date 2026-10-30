"use client";

import { useEffect, useState } from "react";

/**
 * Shared, lightweight poller for the unread-notifications badge.
 *
 * Previously TopBar + Sidebar each downloaded the *entire* notifications
 * collection every 5s (and the server also ran the reminder scan each time).
 * This module keeps a single timer for the whole app, asks the server only for
 * a count, pauses while the tab is hidden, and shares the value between all
 * subscribers.
 */

const POLL_INTERVAL_MS = 30_000;

type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let lastCount = 0;
let inFlight = false;

async function refresh() {
  if (inFlight) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

  inFlight = true;
  try {
    const res = await fetch("/api/notifications?countOnly=true", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      lastCount = Number(data?.unread) || 0;
      listeners.forEach((l) => l(lastCount));
    }
  } catch {
    // Network hiccup – keep the previous badge value.
  } finally {
    inFlight = false;
  }
}

function handleVisibility() {
  if (document.visibilityState === "visible") refresh();
}

function start() {
  if (timer) return;
  refresh();
  timer = setInterval(refresh, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", handleVisibility);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", handleVisibility);
}

/** Force an immediate badge refresh (e.g. after marking notifications as read). */
export function refreshUnreadNotifications() {
  refresh();
}

export function useUnreadNotifications(enabled: boolean = true): number {
  const [count, setCount] = useState(lastCount);

  useEffect(() => {
    if (!enabled) return;

    listeners.add(setCount);
    setCount(lastCount);
    start();

    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0) stop();
    };
  }, [enabled]);

  return count;
}
