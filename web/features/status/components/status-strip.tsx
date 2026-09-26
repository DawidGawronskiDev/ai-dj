import { StatusDot } from "@/components/status-dot";
import { formatClock } from "@/lib/format";
import type { Deck } from "@/features/deck/hooks/use-deck";

type StatusStripProps = {
  deck: Deck;
};

export const StatusStrip = ({ deck }: StatusStripProps) => {
  const { state, status, connectionError } = deck;

  return (
    <div className="flex min-h-[47px] items-center gap-[25px] border-b border-foreground px-[30px] text-[10px] text-muted-foreground max-[720px]:gap-2.5 max-[720px]:px-5 max-[720px]:text-[8px]">
      <span>
        <StatusDot tone={connectionError ? "bad" : "on"} />
        {connectionError
          ? "CONTROLLER OFFLINE"
          : `${status.toUpperCase()} · ${status === "running" ? "LOCKED" : "STANDBY"}`}
      </span>
      <span className="max-[720px]:hidden">
        {state?.speechMuted ? "VOICE MUTED" : "VOICE READY"}
      </span>
      <span className="ml-auto">
        ENDS {state ? formatClock(state.plannedEndMs) : "--:--"}
      </span>
    </div>
  );
};
