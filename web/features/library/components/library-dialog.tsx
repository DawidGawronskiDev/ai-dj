"use client";

import { useMemo, useState } from "react";

import { EmptyCopy } from "@/components/empty-copy";
import type { Deck } from "@/features/deck/hooks/use-deck";

import { LibraryFooter } from "./library-footer";
import { LibraryTrack } from "./library-track";

type LibraryDialogProps = {
  deck: Deck;
  replaceIndex: number | null;
  onClose: () => void;
};

export const LibraryDialog = ({
  deck,
  replaceIndex,
  onClose,
}: LibraryDialogProps) => {
  const [search, setSearch] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const { state, canControl, actionError, command } = deck;

  const pool = useMemo(
    () =>
      (state?.pool ?? [])
        .filter((track) =>
          `${track.title} ${track.artist} ${track.album ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 24),
    [state?.pool, search],
  );

  const send = (name: string, body: Record<string, unknown>, success: string) =>
    void command(name, body, success).then((ok) => {
      if (ok) onClose();
    });

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-foreground/68 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex max-h-[min(760px,calc(100vh-40px))] w-[min(690px,100%)] flex-col border-2 border-foreground bg-card shadow-[10px_10px_0_var(--primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
      >
        <div className="flex items-start justify-between px-[26px] pt-6 pb-3.5">
          <div>
            <span className="text-[11px] text-primary">THE APPROVED POOL</span>
            <h2
              className="mt-[9px] text-[58px] leading-[0.9] tracking-tighter"
              id="library-title"
            >
              {replaceIndex === null ? "Find a record" : "Replace record"}
            </h2>
          </div>
          <button
            className="border-0 bg-transparent text-[37px] leading-none tracking-tighter"
            onClick={onClose}
            aria-label="Close library"
          >
            ×
          </button>
        </div>
        <input
          className="mx-[26px] mb-[18px] w-[calc(100%-52px)] border border-foreground bg-background px-[15px] py-[13px] text-foreground"
          autoFocus
          placeholder="Search title, artist, or album"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="min-h-[150px] flex-1 overflow-auto border-y border-foreground">
          {pool.map((track) => (
            <LibraryTrack
              key={track.id}
              track={track}
              selected={selectedTrack === track.id}
              onSelect={() => setSelectedTrack(track.id)}
            />
          ))}
          {pool.length === 0 && (
            <EmptyCopy className="px-[26px]">
              No records match that search.
            </EmptyCopy>
          )}
        </div>
        {actionError && (
          <p
            className="m-0 border-b border-destructive px-[26px] py-2.5 text-[11px] text-destructive"
            role="alert"
          >
            {actionError}
          </p>
        )}
        <LibraryFooter
          selectedTitle={
            state?.pool.find((track) => track.id === selectedTrack)?.title
          }
          replacing={replaceIndex !== null}
          disabled={!selectedTrack || !canControl}
          onQueue={() =>
            send(
              "queue",
              { trackId: selectedTrack, source: "operator" },
              "Track added to queue",
            )
          }
          onPlayNext={() =>
            send("force-next", { trackId: selectedTrack }, "Track set to play next")
          }
          onReplace={() =>
            send(
              "replace",
              { index: replaceIndex, trackId: selectedTrack },
              "Queued track replaced",
            )
          }
        />
      </section>
    </div>
  );
};
