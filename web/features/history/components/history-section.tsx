import { BoxSection } from "@/components/box-section";
import { EmptyCopy } from "@/components/empty-copy";
import { formatClock } from "@/lib/format";
import type { EventState } from "@/lib/types";

type HistorySectionProps = {
  state: EventState | null;
};

export const HistorySection = ({ state }: HistorySectionProps) => {
  const history = state?.history.slice(-4).reverse() ?? [];

  return (
    <BoxSection
      className="min-h-[210px] flex-1 max-[720px]:min-h-[120px]"
      heading="RECENTLY SPUN"
      meta="THE SESSION"
    >
      {history.length ? (
        history.map((item, index) => {
          const track = state?.pool.find((entry) => entry.id === item.trackId);
          return (
            <div
              className="grid grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-3 border-b border-border py-3 text-[11px] last:border-0 max-[720px]:grid-cols-[75px_minmax(0,1fr)_minmax(0,1fr)] max-[430px]:grid-cols-[75px_minmax(0,1fr)] max-[430px]:gap-1.5"
              key={`${item.trackId}-${index}`}
            >
              <span className="text-muted-foreground max-[720px]:whitespace-nowrap">
                {formatClock(item.startedAtMs)}
              </span>
              <strong className="text-[18px] tracking-tighter">
                {track?.title ?? item.trackId}
              </strong>
              <span className="text-right text-muted-foreground max-[430px]:hidden">
                {track?.artist ?? ""}
              </span>
            </div>
          );
        })
      ) : (
        <EmptyCopy>
          The platter has been quiet. Nothing spun yet this session.
        </EmptyCopy>
      )}
    </BoxSection>
  );
};
