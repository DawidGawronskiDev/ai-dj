import { cn } from "@/lib/utils";

const BARS = [24, 38, 52, 70, 56, 84, 64, 44, 26];

type DeckSignalProps = {
  live: boolean;
};

export const DeckSignal = ({ live }: DeckSignalProps) => {
  return (
    <div className="flex flex-col items-end gap-2 text-[8px] whitespace-nowrap">
      <div
        className="flex h-[85px] w-[54px] items-end gap-0.5 border-b-4 border-foreground max-[720px]:h-[65px]"
        aria-hidden="true"
      >
        {BARS.map((height, index) => (
          <i
            key={index}
            className={cn(
              "block w-1",
              index % 3 === 2 ? "bg-primary" : "bg-foreground",
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <span>SIGNAL {live ? "LIVE" : "IDLE"}</span>
    </div>
  );
};
