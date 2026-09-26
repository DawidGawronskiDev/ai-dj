import { formatTime } from "@/lib/format";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";

type LibraryTrackProps = {
  track: Track;
  selected: boolean;
  onSelect: () => void;
};

export const LibraryTrack = ({
  track,
  selected,
  onSelect,
}: LibraryTrackProps) => {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between gap-[15px] border-0 border-b border-border bg-transparent px-[26px] py-3 text-left text-foreground hover:bg-secondary",
        selected && "bg-secondary shadow-[inset_5px_0_var(--primary)]",
      )}
      onClick={onSelect}
    >
      <span className="flex flex-col gap-[3px]">
        <strong className="text-[22px] tracking-tighter">{track.title}</strong>
        <small className="text-[10px] text-muted-foreground">
          {track.artist}
          {track.album ? ` · ${track.album}` : ""}
        </small>
      </span>
      <span>{formatTime(track.durationMs)}</span>
    </button>
  );
};
