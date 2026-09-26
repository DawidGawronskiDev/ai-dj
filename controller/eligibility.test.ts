import assert from "node:assert/strict";
import test from "node:test";
import { checkSelection, type SelectionRequest } from "./eligibility.ts";

const minute = 60_000;
const eventPool = [
  { id: "a1", artistId: "artist-a", durationMs: 4 * minute },
  { id: "a2", artistId: "artist-a", durationMs: 4 * minute },
  { id: "b1", artistId: "artist-b", durationMs: 4 * minute },
];

function request(overrides: Partial<Omit<SelectionRequest, "source" | "operatorOverride">> = {}): SelectionRequest {
  return {
    trackId: "b1",
    source: "agent",
    eventPool,
    history: [],
    upcoming: [],
    expectedStartMs: 40 * minute,
    ...overrides,
  };
}

test("rejects tracks outside the frozen event pool even with operator overrides", () => {
  assert.deepEqual(
    checkSelection({ ...request({ trackId: "unknown" }), source: "operator", operatorOverride: { allowRepeats: true, allowArtistSpacing: true } }),
    { eligible: false, reasons: ["outside-event-pool"] },
  );
});

test("actual playback history blocks repeats, including fallback playback", () => {
  assert.deepEqual(
    checkSelection(request({ history: [{ trackId: "b1", artistId: "artist-b", startedAtMs: 0, endedAtMs: 4 * minute }] })).reasons,
    ["track-already-played"],
  );
});

test("a track already in the upcoming queue cannot be selected again", () => {
  assert.deepEqual(
    checkSelection(request({ upcoming: [{ trackId: "b1", artistId: "artist-b", expectedStartMs: 50 * minute, expectedEndMs: 54 * minute }] })).reasons,
    ["track-already-planned", "artist-too-recent"],
  );
});

test("enforces 30 minutes of separation after the previous track ends", () => {
  const history = [{ trackId: "a1", artistId: "artist-a", startedAtMs: 10 * minute, endedAtMs: 14 * minute }];
  assert.deepEqual(checkSelection(request({ trackId: "a2", history, expectedStartMs: 43 * minute })).reasons, ["artist-too-recent"]);
  assert.deepEqual(checkSelection(request({ trackId: "a2", history, expectedStartMs: 44 * minute })).reasons, []);
});

test("operator may explicitly override repeats and artist spacing inside the pool", () => {
  const history = [{ trackId: "a1", artistId: "artist-a", startedAtMs: 20 * minute, endedAtMs: 24 * minute }];
  assert.deepEqual(
    checkSelection({ ...request({ trackId: "a1", history }), source: "operator", operatorOverride: { allowRepeats: true, allowArtistSpacing: true } }),
    { eligible: true, reasons: [] },
  );
});
