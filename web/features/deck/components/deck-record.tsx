import { cn } from "@/lib/utils";

type DeckRecordProps = {
  playing: boolean;
  title: string;
};

export const DeckRecord = ({ playing, title }: DeckRecordProps) => {
  return (
    <div
      className="relative isolate mx-auto mt-[25px] mb-[5px] aspect-square w-[min(76%,620px)] max-[980px]:w-[88%] max-[720px]:mt-[35px] max-[720px]:mb-[30px] max-[720px]:w-[min(72vw,380px)]"
      aria-label={playing ? `Playing ${title}` : "Turntable idle"}
      role="img"
    >
      <div className="absolute -inset-[5%] rounded-full border-2 border-dotted border-foreground/25" />
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-foreground bg-[repeating-radial-gradient(circle_at_center,var(--foreground)_0,color-mix(in_oklab,var(--foreground)_94%,var(--card))_2px,var(--foreground)_3px,color-mix(in_oklab,var(--foreground)_90%,var(--card))_4px)] shadow-[inset_18px_18px_28px_color-mix(in_oklab,var(--card)_5%,transparent),inset_-15px_-19px_35px_color-mix(in_oklab,var(--foreground)_48%,transparent),0_20px_45px_color-mix(in_oklab,var(--foreground)_23%,transparent)]",
          "before:absolute before:inset-[5%] before:rounded-full before:bg-[repeating-radial-gradient(circle,transparent_0_8px,color-mix(in_oklab,var(--card)_3%,transparent)_9px_10px,transparent_11px_13px)]",
          playing && "animate-spin [animation-duration:1.8s] motion-reduce:animate-none",
        )}
      >
        <div className="absolute inset-[27%] flex -rotate-18 flex-col items-center justify-center gap-[7px] overflow-hidden rounded-full border-[5px] border-primary bg-card text-center shadow-[0_0_0_2px_color-mix(in_oklab,var(--card)_25%,transparent)] outline-4 outline-foreground after:pointer-events-none after:absolute after:inset-[7px] after:rounded-full after:border after:border-border">
          <span className="z-1 text-[clamp(5px,0.5vw,9px)] max-[720px]:text-[7px]">
            AI DJ · SIDE A
          </span>
          <span className="z-1 size-2.5 rounded-full bg-foreground" />
          <strong className="z-1 max-w-[80%] text-[clamp(16px,2vw,31px)] leading-[0.9] tracking-tighter max-[720px]:text-[clamp(16px,5vw,29px)]">
            {title}
          </strong>
          <span className="z-1 text-[clamp(5px,0.5vw,9px)] text-primary max-[720px]:text-[7px]">
            DIRECT DRIVE / 33 RPM
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute top-[7%] left-[84%] z-2 h-[76%] w-[14%] origin-[30%_7%] rotate-6">
        <span className="absolute top-0 left-[9%] z-2 aspect-square w-[42%] rounded-full border-8 border-foreground bg-card shadow-[0_0_0_2px_var(--border)] after:absolute after:inset-[32%] after:rounded-full after:bg-foreground" />
        <span className="absolute top-[6%] left-[28%] h-[80%] w-2 origin-top rotate-7 rounded-[5px] bg-card shadow-[3px_2px_1px_color-mix(in_oklab,var(--foreground)_40%,transparent)]" />
        <span className="absolute bottom-0 left-[29%] h-[58px] w-[30px] rotate-25 rounded-[3px] bg-foreground after:absolute after:-bottom-[13px] after:left-[13px] after:h-[21px] after:w-[7px] after:rounded-[5px] after:bg-primary" />
      </div>
    </div>
  );
};
