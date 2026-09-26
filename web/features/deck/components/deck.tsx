"use client";

import { useState } from "react";

import { Header } from "@/features/header/components/header";
import { HistorySection } from "@/features/history/components/history-section";
import { LibraryDialog } from "@/features/library/components/library-dialog";
import { LoginScreen } from "@/features/login/components/login-screen";
import { NowPlaying } from "@/features/now-playing/components/now-playing";
import { QueueSection } from "@/features/queue/components/queue-section";
import { StatusMessages } from "@/features/status/components/status-messages";
import { StatusStrip } from "@/features/status/components/status-strip";
import { SteerLatest } from "@/features/steer/components/steer-latest";
import { SteerPanel } from "@/features/steer/components/steer-panel";

import { useDeck } from "../hooks/use-deck";
import { DeckLoading } from "./deck-loading";
import { DeckTurntable } from "./deck-turntable";

export const Deck = () => {
  const deck = useDeck();
  // null = closed; replaceIndex null = add/play-next mode.
  const [library, setLibrary] = useState<{ replaceIndex: number | null } | null>(
    null,
  );

  if (deck.view === "loading") return <DeckLoading />;
  if (deck.view === "login")
    return (
      <LoginScreen
        error={deck.actionError}
        pending={deck.pending}
        onSignIn={deck.signIn}
      />
    );

  return (
    <main className="min-h-screen border border-foreground bg-background bg-[radial-gradient(ellipse_at_58%_28%,color-mix(in_oklab,var(--card)_24%,transparent),transparent_52%)]">
      <Header
        status={deck.status}
        brief={deck.state?.eventBrief}
        onSignOut={() => void deck.signOut()}
      />
      <div className="grid min-h-[min(810px,calc(100vh-115px))] grid-cols-[minmax(420px,44%)_minmax(0,56%)] border-b border-foreground max-[980px]:grid-cols-[minmax(350px,45%)_minmax(0,55%)] max-[720px]:flex max-[720px]:flex-col">
        <DeckTurntable deck={deck} />
        <section
          className="flex min-w-0 flex-col max-[720px]:contents"
          aria-label="Set details"
        >
          <NowPlaying
            state={deck.state}
            status={deck.status}
            current={deck.current}
            elapsedMs={deck.elapsed}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-[30px] py-[18px] max-[980px]:px-[23px] max-[980px]:py-[15px] max-[720px]:order-3 max-[720px]:gap-3 max-[720px]:px-5 max-[720px]:py-[13px]">
            <QueueSection
              state={deck.state}
              onReplace={(replaceIndex) => setLibrary({ replaceIndex })}
            />
            <HistorySection state={deck.state} />
          </div>
          <SteerPanel
            deck={deck}
            libraryOpen={!!library}
            onBrowse={() =>
              setLibrary(library ? null : { replaceIndex: null })
            }
          />
        </section>
      </div>
      <StatusStrip deck={deck} />
      <StatusMessages deck={deck} />
      <SteerLatest steering={deck.state?.steering ?? []} />
      {library && (
        <LibraryDialog
          deck={deck}
          replaceIndex={library.replaceIndex}
          onClose={() => setLibrary(null)}
        />
      )}
    </main>
  );
};
