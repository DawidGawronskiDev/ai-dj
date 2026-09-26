type SteerLatestProps = {
  steering: string[];
};

export const SteerLatest = ({ steering }: SteerLatestProps) => {
  if (!steering.length) return null;

  return (
    <div className="px-[30px] pt-[18px] pb-[30px] text-[10px] text-muted-foreground">
      <span className="text-[11px]">LATEST DIRECTION</span>
      <p className="mt-[9px] text-[14px] text-foreground">
        “{steering.at(-1)}”
      </p>
    </div>
  );
};
