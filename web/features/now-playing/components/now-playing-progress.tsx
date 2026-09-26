import {
  ScrubBarContainer,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
  ScrubBarTrack,
} from "@/components/ui/scrub-bar";

type NowPlayingProgressProps = {
  elapsedMs: number;
  durationMs: number;
};

export const NowPlayingProgress = ({
  elapsedMs,
  durationMs,
}: NowPlayingProgressProps) => {
  const elapsed = Math.min(elapsedMs, durationMs) / 1000;
  const duration = durationMs / 1000;

  return (
    <ScrubBarContainer
      className="mt-[25px] gap-[13px] text-[12px] max-[720px]:mt-5"
      duration={duration}
      value={elapsed}
    >
      <ScrubBarTimeLabel time={elapsed} />
      <ScrubBarTrack
        className="h-1.5 min-w-0 flex-1 cursor-default rounded-none bg-border"
        role="progressbar"
        aria-label="Track progress"
      >
        <ScrubBarProgress className="bg-primary" />
        <ScrubBarThumb className="size-3 rounded-none bg-foreground" />
      </ScrubBarTrack>
      <ScrubBarTimeLabel time={duration} />
    </ScrubBarContainer>
  );
};
