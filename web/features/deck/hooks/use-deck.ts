import { useCallback, useEffect, useState } from "react";

import type { EventState } from "@/lib/types";

type View = "loading" | "login" | "deck";

export const useDeck = () => {
  const [view, setView] = useState<View>("loading");
  const [state, setState] = useState<EventState | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadState = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.status === 401) {
        setView("login");
        setState(null);
        return;
      }
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not reach controller");
      setState(data as EventState);
      setConnectionError("");
      setView("deck");
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not reach controller",
      );
      setView((current) => (current === "loading" ? "deck" : current));
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (view !== "deck") return;
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadState();
    }, 2500);
    return () => window.clearInterval(refresh);
  }, [loadState, view]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const signIn = async (password: string) => {
    setPending(true);
    setActionError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not sign in");
      setView("deck");
      await loadState();
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not sign in",
      );
      return false;
    } finally {
      setPending(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/logout", { method: "POST" });
    setView("login");
    setState(null);
  };

  const command = async (
    name: string,
    body: Record<string, unknown> = {},
    success?: string,
  ): Promise<boolean> => {
    setPending(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: name, ...body }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setView("login");
        setState(null);
        throw new Error("Session expired. Sign in again.");
      }
      if (!response.ok) throw new Error(data.error ?? "Command failed");
      setNotice(success ?? `${name.replace("-", " ")} sent`);
      await loadState();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Command failed");
      return false;
    } finally {
      setPending(false);
    }
  };

  const current = state?.pool.find(
    (track) => track.id === state.current?.trackId,
  );
  const elapsed = state?.current
    ? Math.max(0, now - state.current.startedAtMs)
    : 0;

  return {
    view,
    state,
    current,
    elapsed,
    status: state?.status ?? "offline",
    canControl: !!state && !connectionError && !pending,
    connectionError,
    actionError,
    notice,
    pending,
    loadState,
    signIn,
    signOut,
    command,
  };
};

export type Deck = ReturnType<typeof useDeck>;
