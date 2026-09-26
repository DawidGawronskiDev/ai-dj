export const DeckLoading = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[15px] bg-background">
      <span className="text-[23px] tracking-tighter whitespace-nowrap">
        AI DJ
      </span>
      <p className="text-[11px]">Connecting to the deck…</p>
    </main>
  );
};
