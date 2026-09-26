import { cn } from "@/lib/utils";

type StatusDotProps = React.ComponentProps<"i"> & {
  tone: "on" | "off" | "bad";
};

export const StatusDot = ({ tone, className, ...props }: StatusDotProps) => {
  return (
    <i
      className={cn(
        "mr-2 inline-block size-[7px] rounded-full align-[2px]",
        tone === "off"
          ? "bg-muted-foreground"
          : "bg-primary shadow-[0_0_0_3px_var(--primary)] shadow-primary/12",
        tone === "bad" && "bg-destructive",
        className,
      )}
      {...props}
    />
  );
};
