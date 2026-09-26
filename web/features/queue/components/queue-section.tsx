import { BoxSection } from "@/components/box-section";
import { EmptyCopy } from "@/components/empty-copy";
import { formatTime } from "@/lib/format";
import type { EventState } from "@/lib/types";

type QueueSectionProps = {
  state: EventState | null;
  onReplace: (index: number) => void;
};

export const QueueSection = ({ state, onReplace }: QueueSectionProps) => {
  const upcoming = state?.upcoming ?? [];

  return (
    <BoxSection
      className="min-h-[89px]"
      heading="NEXT ON THE PLATTER"
      meta={`${upcoming.length} QUEUED`}
    >
      {upcoming.length ? (
        upcoming.slice(0, 4).map((entry, index) => {
          const track = state?.pool.find((item) => item.id === entry.trackId);
          return (
            <div
              className="flex min-h-[67px] items-center gap-3.5 border-b border-border last:border-0"
              key={`${entry.trackId}-${index}`}
            >
              <span className="text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <strong className="text-[20px] leading-[1.05] tracking-tighter">
                  {track?.title ?? entry.trackId}
                </strong>
                <small className="text-[9px] text-muted-foreground">
                  {track?.artist ?? "Unknown artist"} ·{" "}
                  {entry.source === "agent"
                    ? "MARLOWE'S PICK"
                    : entry.source.toUpperCase()}
                  {entry.committed ? " · LOCKED" : ""}
                </small>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {track ? formatTime(track.durationMs) : ""}
              </span>
              {!entry.committed && (
                <button
                  className="border-0 bg-transparent px-0 py-2 text-[9px] text-foreground"
                  onClick={() => onReplace(index)}
                  title={`Choose a replacement for ${track?.title ?? "this track"}`}
                >
                  EDIT ↗
                </button>
              )}
            </div>
          );
        })
      ) : (
        <EmptyCopy>Nothing cued. The selector will choose at the run-out.</EmptyCopy>
      )}
    </BoxSection>
  );
};
