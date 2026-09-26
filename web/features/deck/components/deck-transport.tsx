import { cn } from "@/lib/utils";

import type { Deck } from "../hooks/use-deck";

const roundControl =
  "flex size-16 flex-col items-center justify-center gap-[3px] rounded-full border-[1.5px] border-foreground bg-transparent shadow-[2px_3px_0_var(--foreground)] shadow-foreground/14 max-[720px]:size-[58px]";

type DeckTransportProps = {
  deck: Deck;
};

export const DeckTransport = ({ deck }: DeckTransportProps) => {
  const { state, status, current, canControl, command } = deck;
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isMuted = !!state?.speechMuted;

  return (
    <div className="flex items-end gap-[13px]">
      <button
        className="flex size-[91px] flex-col items-center justify-center rounded-full border-[1.5px] border-foreground bg-primary text-[10px] text-foreground shadow-[2px_3px_0_var(--foreground)] shadow-foreground/14 max-[720px]:size-[78px]"
        onClick={() => {
          if (!isRunning)
            return void command(
              isPaused ? "resume" : "start",
              {},
              isPaused ? "Playback resumed" : "Playback started",
            );
          if (
            window.confirm(
              "Stop the event? This ends playback and cannot be resumed.",
            )
          )
            void command("stop", {}, "Event stopped");
        }}
        disabled={!canControl || status === "stopped"}
      >
        <span className="mb-[7px] text-[23px] leading-none tracking-tighter">
          {isRunning ? "■" : "▶"}
        </span>
        <span>{isRunning ? "STOP" : isPaused ? "RESUME" : "START"}</span>
      </button>
      <button
        className={roundControl}
        onClick={() => void command("skip", {}, "Skipping current track")}
        disabled={!canControl || !isRunning || !current}
        title="Skip current track"
      >
        <span className="text-[22px] leading-none tracking-tighter">↠</span>
        <small className="text-[8px]">SKIP</small>
      </button>
      <button
        className={cn(roundControl, isMuted && "bg-foreground text-card")}
        onClick={() =>
          void command(
            "mute",
            { muted: !isMuted },
            isMuted ? "Speech unmuted" : "Speech muted",
          )
        }
        disabled={!canControl}
        title={isMuted ? "Unmute speech" : "Mute speech"}
      >
        <span className="text-[22px] leading-none tracking-tighter">
          {isMuted ? "×" : "◖"}
        </span>
        <small className="text-[8px]">VOICE</small>
      </button>
    </div>
  );
};
