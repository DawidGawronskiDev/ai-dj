import type { Deck } from "../hooks/use-deck";
import { DeckRecord } from "./deck-record";
import { DeckSignal } from "./deck-signal";
import { DeckTransport } from "./deck-transport";

type DeckTurntableProps = {
  deck: Deck;
};

export const DeckTurntable = ({ deck }: DeckTurntableProps) => {
  const isLive = deck.status === "running";

  return (
    <section
      className="relative flex min-h-[710px] flex-col justify-between overflow-hidden border-r border-foreground px-7 pt-6 pb-[25px] max-[980px]:min-h-[650px] max-[720px]:order-2 max-[720px]:min-h-0 max-[720px]:border-t max-[720px]:border-r-0 max-[720px]:px-5 max-[720px]:pt-[18px] max-[720px]:pb-[21px]"
      aria-label="Turntable and playback controls"
    >
      <div className="text-[11px] text-muted-foreground max-[720px]:text-[9px]">
        DIRECT DRIVE <span className="px-[5px]">·</span> QUARTZ LOCK
      </div>
      <DeckRecord
        playing={isLive && !!deck.current}
        title={deck.current?.title ?? "AI DJ"}
      />
      <div className="flex items-end justify-between gap-3">
        <DeckTransport deck={deck} />
        <DeckSignal live={isLive} />
      </div>
    </section>
  );
};
