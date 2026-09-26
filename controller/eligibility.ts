export interface Track {
  id: string;
  artistId: string;
  durationMs: number;
}

export interface PlayedTrack {
  trackId: string;
  artistId: string;
  startedAtMs: number;
  endedAtMs: number;
}

export interface PlannedTrack {
  trackId: string;
  artistId: string;
  expectedStartMs: number;
  expectedEndMs: number;
}

export type Rejection =
  | "outside-event-pool"
  | "track-already-played"
  | "track-already-planned"
  | "artist-too-recent";

interface SelectionRequestBase {
  trackId: string;
  eventPool: readonly Track[];
  history: readonly PlayedTrack[];
  upcoming: readonly PlannedTrack[];
  expectedStartMs: number;
}

export type SelectionRequest = SelectionRequestBase & (
  | { source: "agent" | "fallback"; operatorOverride?: never }
  | { source: "operator"; operatorOverride?: { allowRepeats?: boolean; allowArtistSpacing?: boolean } }
);

export interface SelectionResult {
  eligible: boolean;
  reasons: readonly Rejection[];
}

const ARTIST_SPACING_MS = 30 * 60 * 1000;

/** Check an AI, fallback, or operator selection against the frozen event pool. */
export function checkSelection(request: SelectionRequest): SelectionResult {
  const track = request.eventPool.find((item) => item.id === request.trackId);
  if (!track) {
    return { eligible: false, reasons: ["outside-event-pool"] };
  }

  const reasons: Rejection[] = [];
  const override = request.operatorOverride;

  if (!override?.allowRepeats) {
    if (request.history.some((item) => item.trackId === track.id)) {
      reasons.push("track-already-played");
    }
    if (request.upcoming.some((item) => item.trackId === track.id)) {
      reasons.push("track-already-planned");
    }
  }

  if (!override?.allowArtistSpacing) {
    const sameArtistIntervals = [
      ...request.history.filter((item) => item.artistId === track.artistId).map((item) => ({ start: item.startedAtMs, end: item.endedAtMs })),
      ...request.upcoming.filter((item) => item.artistId === track.artistId).map((item) => ({ start: item.expectedStartMs, end: item.expectedEndMs })),
    ];
    const candidateEndMs = request.expectedStartMs + track.durationMs;
    if (sameArtistIntervals.some(({ start, end }) =>
      request.expectedStartMs < end + ARTIST_SPACING_MS &&
      start < candidateEndMs + ARTIST_SPACING_MS
    )) {
      reasons.push("artist-too-recent");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
