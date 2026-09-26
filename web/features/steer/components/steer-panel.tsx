"use client";

import { useState } from "react";

import type { Deck } from "@/features/deck/hooks/use-deck";

type SteerPanelProps = {
  deck: Deck;
  libraryOpen: boolean;
  onBrowse: () => void;
};

export const SteerPanel = ({ deck, libraryOpen, onBrowse }: SteerPanelProps) => {
  const [steering, setSteering] = useState("");
  const { state, status, canControl, command } = deck;
  const isStopped = status === "stopped";

  return (
    <div className="mx-[30px] mb-[18px] border border-foreground bg-card/18 px-4 max-[980px]:mx-[23px] max-[980px]:mb-[15px] max-[720px]:order-4 max-[720px]:mx-5 max-[720px]:mb-[17px]">
      <form
        className="flex h-12 items-center gap-3 border-b border-border max-[430px]:gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!steering.trim()) return;
          void command(
            "steer",
            { instruction: steering.trim() },
            "Direction sent to Marlowe",
          ).then((ok) => {
            if (ok) setSteering("");
          });
        }}
      >
        <label
          className="text-[10px] whitespace-nowrap max-[430px]:text-[9px]"
          htmlFor="steering"
        >
          DEAR DJ —
        </label>
        <input
          className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-[3px] py-1.5 text-[12px] text-foreground outline-0 placeholder:text-muted-foreground"
          id="steering"
          value={steering}
          onChange={(event) => setSteering(event.target.value)}
          placeholder="a song, an artist, a feeling…"
          disabled={!canControl || isStopped}
        />
        <button
          className="border-0 bg-transparent text-[10px] whitespace-nowrap text-foreground max-[430px]:text-[9px]"
          disabled={!canControl || !steering.trim() || isStopped}
        >
          SEND ↗
        </button>
      </form>
      <div className="flex h-9 items-center justify-between text-[9px] text-muted-foreground">
        <button
          className="border-0 bg-transparent p-0 text-[10px] whitespace-nowrap text-primary"
          onClick={onBrowse}
          disabled={!state}
          aria-expanded={libraryOpen}
        >
          BROWSE MUSIC ↗
        </button>
        <span>{state?.pool.length ?? 0} APPROVED TRACKS</span>
      </div>
    </div>
  );
};
