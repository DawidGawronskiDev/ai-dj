import { cn } from "@/lib/utils";
import type { Deck } from "@/features/deck/hooks/use-deck";

const TONES = {
  error: "border-destructive text-destructive",
  warning: "border-chart-3 text-chart-3",
  success: "border-chart-2 text-chart-2",
};

type StatusMessageProps = React.ComponentProps<"p"> & {
  tone: keyof typeof TONES;
};

const StatusMessage = ({ tone, className, ...props }: StatusMessageProps) => {
  return (
    <p
      className={cn(
        "mb-[7px] flex justify-between gap-3 border px-[13px] py-[9px] text-[11px]",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
};

type StatusMessagesProps = {
  deck: Deck;
};

export const StatusMessages = ({ deck }: StatusMessagesProps) => {
  const { state, connectionError, actionError, notice, loadState } = deck;
  const hasMessages =
    connectionError || actionError || notice || !!state?.warnings.length;

  if (!hasMessages) return null;

  return (
    <div className="px-[30px] pt-2.5" aria-live="polite">
      {connectionError && (
        <StatusMessage tone="error">
          {connectionError}{" "}
          <button
            className="border-0 bg-transparent text-inherit"
            onClick={() => void loadState()}
          >
            RETRY ↗
          </button>
        </StatusMessage>
      )}
      {actionError && <StatusMessage tone="error">{actionError}</StatusMessage>}
      {notice && <StatusMessage tone="success">{notice}</StatusMessage>}
      {state?.warnings.slice(-2).map((warning, index) => (
        <StatusMessage tone="warning" key={index}>
          WARNING / {warning}
        </StatusMessage>
      ))}
    </div>
  );
};
