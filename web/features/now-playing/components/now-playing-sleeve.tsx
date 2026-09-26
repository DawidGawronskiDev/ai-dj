import { Matrix, pulse, wave } from "@/components/ui/matrix";

type NowPlayingSleeveProps = {
  year?: number;
  playing: boolean;
};

export const NowPlayingSleeve = ({ year, playing }: NowPlayingSleeveProps) => {
  return (
    <div
      className="relative grid size-[132px] flex-none place-items-center bg-foreground shadow-[4px_5px_0_var(--foreground)] shadow-foreground/15 max-[980px]:size-[95px] max-[720px]:size-[89px] max-[430px]:size-[75px]"
      aria-hidden="true"
    >
      <Matrix
        className="w-[64%] [&_svg]:h-auto [&_svg]:w-full"
        rows={7}
        cols={7}
        frames={playing ? wave : pulse}
        fps={playing ? 16 : 8}
        palette={{ on: "var(--primary)", off: "var(--muted-foreground)" }}
      />
      <span className="absolute bottom-[5px] left-[6px] text-[7px] text-card">
        AI DJ / {year ?? "26"}
      </span>
    </div>
  );
};
