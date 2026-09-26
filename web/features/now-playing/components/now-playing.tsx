import { ScrollingWaveform } from "@/components/ui/waveform";
import type { EventState, Track } from "@/lib/types";

import { NowPlayingProgress } from "./now-playing-progress";
import { NowPlayingSleeve } from "./now-playing-sleeve";

const IDLE_TITLES: Record<string, string> = {
  prepared: "Ready when you are",
  paused: "On pause",
  stopped: "End of the set",
};

type NowPlayingProps = {
  state: EventState | null;
  status: string;
  current?: Track;
  elapsedMs: number;
};

export const NowPlaying = ({
  state,
  status,
  current,
  elapsedMs,
}: NowPlayingProps) => {
  const isPlaying = status === "running" && !!current;

  return (
    <div className="border-b border-border px-[30px] pt-[29px] pb-[21px] max-[980px]:p-[23px] max-[720px]:order-1 max-[720px]:px-5 max-[720px]:pt-[21px] max-[720px]:pb-[17px]">
      <div className="flex min-w-0 gap-[25px] max-[980px]:gap-[18px] max-[720px]:gap-[15px] max-[430px]:items-start">
        <NowPlayingSleeve year={current?.year} playing={isPlaying} />
        <div className="min-w-0">
          <span className="text-[11px] text-primary max-[430px]:text-[9px]">
            {current ? "NOW SPINNING" : "ON THE TURNTABLE"}
          </span>
          <h1 className="my-[7px] text-[clamp(44px,4.8vw,84px)] leading-[0.88] tracking-tighter [overflow-wrap:anywhere] max-[980px]:text-[clamp(39px,5vw,60px)] max-[720px]:text-[clamp(37px,10vw,57px)] max-[430px]:text-[39px]">
            {current?.title ?? IDLE_TITLES[status] ?? "No record playing"}
          </h1>
          <div className="text-[14px] uppercase max-[720px]:text-[11px]">
            {current?.artist ?? "AI DJ"}
          </div>
          <div className="mt-[7px] text-[11px] text-muted-foreground uppercase max-[720px]:text-[9px] max-[430px]:hidden">
            {current?.album ??
              (state ? `EVENT ${state.id}` : "WAITING FOR CONTROLLER")}
          </div>
        </div>
      </div>
      {isPlaying && (
        <ScrollingWaveform
          className="mt-5 [--foreground:var(--primary)]"
          aria-hidden="true"
          height={48}
          barWidth={3}
          barGap={2}
        />
      )}
      <NowPlayingProgress
        elapsedMs={current ? elapsedMs : 0}
        durationMs={current?.durationMs ?? 0}
      />
    </div>
  );
};
