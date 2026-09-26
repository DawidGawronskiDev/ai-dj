import { cn } from "@/lib/utils";

type BoxSectionProps = React.ComponentProps<"section"> & {
  heading: string;
  meta: React.ReactNode;
};

export const BoxSection = ({
  heading,
  meta,
  className,
  children,
  ...props
}: BoxSectionProps) => {
  return (
    <section
      className={cn("border border-foreground bg-card/18", className)}
      {...props}
    >
      <div className="flex min-h-[39px] items-center justify-between gap-2.5 border-b border-border px-[15px]">
        <h2 className="m-0 text-[11px]">{heading}</h2>
        <span className="text-[9px] whitespace-nowrap text-muted-foreground">
          {meta}
        </span>
      </div>
      <div className="px-[15px]">{children}</div>
    </section>
  );
};
