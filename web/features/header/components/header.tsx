import { cn } from "cn";

import { StatusDot } from "@/components/status-dot";

export type HeaderProps = React.ComponentProps<"header"> & {
  status: string;
  brief?: string;
  onSignOut: () => void;
};

export const Header = ({
  status,
  brief,
  onSignOut,
  className,
  ...props
}: HeaderProps) => {
  const isLive = status === "running";

  return (
    <header
      className={cn(
        "flex h-[68px] items-center justify-between gap-6 border-b border-foreground px-[2.1%] max-[720px]:h-[58px] max-[720px]:px-[17px]",
        className,
      )}
      {...props}
    >
      <div className="text-[23px] tracking-tighter whitespace-nowrap max-[720px]:text-[18px]">
        AI<span className="text-primary">/</span>DJ
      </div>
      <div className="flex min-w-0 items-center gap-[25px] text-[11px] max-[720px]:gap-3">
        <span className="whitespace-nowrap text-primary">
          <StatusDot tone={isLive ? "on" : "off"} />
          {isLive ? "ON AIR" : status.toUpperCase()}
        </span>
        <span className="max-w-[40vw] truncate uppercase max-[720px]:hidden">
          {brief || "THE OPERATOR DECK"}
        </span>
        <button
          className="border-0 border-l border-border bg-transparent py-[5px] pr-0 pl-5 text-[10px] whitespace-nowrap text-foreground max-[720px]:pl-3 max-[720px]:text-[9px]"
          onClick={onSignOut}
          title="Sign out"
        >
          SIGN OUT ↗
        </button>
      </div>
    </header>
  );
};
