import { cn } from "@/lib/utils";

const footerButton =
  "border border-foreground bg-transparent px-[13px] py-[11px] text-[9px] max-[430px]:flex-1";

type LibraryFooterProps = {
  selectedTitle?: string;
  replacing: boolean;
  disabled: boolean;
  onQueue: () => void;
  onPlayNext: () => void;
  onReplace: () => void;
};

export const LibraryFooter = ({
  selectedTitle,
  replacing,
  disabled,
  onQueue,
  onPlayNext,
  onReplace,
}: LibraryFooterProps) => {
  return (
    <div className="flex items-center justify-between gap-[15px] px-[26px] py-[18px] text-[10px] max-[430px]:flex-col max-[430px]:items-stretch">
      <span className="truncate">{selectedTitle ?? "SELECT A RECORD"}</span>
      <div className="flex flex-none gap-2 max-[430px]:w-full">
        {replacing ? (
          <button
            className={cn(footerButton, "bg-primary")}
            onClick={onReplace}
            disabled={disabled}
          >
            REPLACE ↗
          </button>
        ) : (
          <>
            <button className={footerButton} onClick={onQueue} disabled={disabled}>
              ADD TO QUEUE
            </button>
            <button
              className={cn(footerButton, "bg-primary")}
              onClick={onPlayNext}
              disabled={disabled}
            >
              PLAY NEXT ↗
            </button>
          </>
        )}
      </div>
    </div>
  );
};
