import { cn } from "@/lib/utils";

type EmptyCopyProps = React.ComponentProps<"p">;

export const EmptyCopy = ({ className, ...props }: EmptyCopyProps) => {
  return (
    <p
      className={cn(
        "my-3.5 text-[12px] leading-[1.6] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
};
