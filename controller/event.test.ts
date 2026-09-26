import assert from "node:assert/strict";
import test from "node:test";
import {
  addSelection, buildSchedule, commitIncoming, forceNext, nextFallback, prepareFallback, recordPlaybackStart,
  reorderUpcoming, replaceUpcoming, steer,
  type EventState, type EventTrack,
} from "./event.ts";

const minute = 60_000;
const pool: EventTrack[] = [
  { id: "a", artistId: "artist-a", artist: "A", title: "A", durationMs: 60 * minute, localPath: "/music/a.mp3" },
  { id: "b", artistId: "artist-b", artist: "B", title: "B", durationMs: 60 * minute, localPath: "/music/b.mp3" },
  { id: "c", artistId: "artist-c", artist: "C", title: "C", durationMs: 60 * minute, localPath: "/music/c.mp3" },
  { id: "d", artistId: "artist-d", artist: "D", title: "D", durationMs: 60 * minute, localPath: "/music/d.mp3" },
  { id: "e", artistId: "artist-e", artist: "E", title: "E", durationMs: 60 * minute, localPath: "/music/e.mp3" },
  { id: "f", artistId: "artist-f", artist: "F", title: "F", durationMs: 60 * minute, localPath: "/music/f.mp3" },
];

function event(): EventState {
  return {
    id: "rehearsal", status: "prepared", plannedEndMs: 300 * minute, eventBrief: "House",
    steering: [], speechMuted: false, pool, fallbackOrder: pool.map((track) => track.id),
    history: [], current: null, upcoming: [], warnings: [],
  };
}

test("preparation builds a unique five-hour fallback order", () => {
  const result = prepareFallback(pool, 0);
  assert.equal(result.order.length, 6);
  assert.equal(new Set(result.order).size, 6);
  assert.ok(result.coverageMs >= 5 * 60 * minute);
});

test("preparation blocks an undersized pool", () => {
  assert.throws(() => prepareFallback(pool.slice(0, 2), 0), /five hours required/);
});

test("steering keeps operator and committed selections", () => {
  let state = addSelection(event(), "a", "agent", 0);
  state = commitIncoming(state);
  state = addSelection(state, "b", "operator", 0);
  state = addSelection(state, "c", "agent", 0);
  state = steer(state, "More upbeat");
  assert.deepEqual(state.upcoming.map((entry) => entry.trackId), ["a", "b"]);
  assert.deepEqual(state.steering, ["More upbeat"]);
});

test("mixer fallback playback enters history and prevents a later repeat", () => {
  let state = recordPlaybackStart(event(), "a", 0);
  state = recordPlaybackStart(state, "b", 60 * minute);
  assert.deepEqual(state.history.map((entry) => entry.trackId), ["a"]);
  assert.throws(() => addSelection(state, "a", "agent", 61 * minute), /track-already-played/);
  assert.deepEqual(state.warnings, []);
});

test("fallback selection uses the next eligible approved track", () => {
  const state = addSelection(event(), "a", "operator", 0);
  const selected = nextFallback(state, 0);
  assert.equal(selected?.upcoming[1]?.trackId, "b");
});

test("published schedule follows prepared fallback order after queued choices", () => {
  const state = event();
  state.fallbackOrder = ["f", "e", "d", "c", "b", "a"];
  const queued = addSelection(state, "c", "operator", 0);
  assert.deepEqual(buildSchedule(queued, 0), ["/music/c.mp3", "/music/f.mp3", "/music/e.mp3", "/music/d.mp3", "/music/b.mp3", "/music/a.mp3"]);
});

test("planned end blocks starts at and after the cutoff", () => {
  const state = event();
  state.plannedEndMs = 55 * minute;
  assert.deepEqual(buildSchedule(state, 0), ["/music/a.mp3"]);
  assert.deepEqual(buildSchedule(state, 55 * minute), []);
});

test("agent cannot use operator overrides", () => {
  assert.throws(() => addSelection(event(), "a", "agent", 0, "", { allowRepeats: true }), /Only operator/);
});

test("force-next keeps a committed transition and protected choices while clearing agent plans", () => {
  let state = addSelection(event(), "a", "agent", 0);
  state = commitIncoming(state);
  state = addSelection(state, "b", "agent", 0);
  state = addSelection(state, "c", "operator", 0);
  state = forceNext(state, "d", 0);
  assert.deepEqual(state.upcoming.map((entry) => entry.trackId), ["a", "d", "c"]);
  assert.equal(state.upcoming[1]?.protected, true);
});

test("reordered agent selections become protected from steering", () => {
  let state = addSelection(event(), "a", "agent", 0);
  state = addSelection(state, "b", "agent", 0);
  state = reorderUpcoming(state, [1, 0], 0);
  assert.deepEqual(steer(state, "More vocal").upcoming.map((entry) => entry.trackId), ["b", "a"]);
  assert.throws(() => reorderUpcoming(commitIncoming(state), [1, 0], 0), /committed/);
});

test("replacement and reorder revalidate artist spacing across the whole queue", () => {
  let state = event();
  state.pool = [...state.pool, { ...pool[0]!, id: "a2", title: "A2" }];
  state = addSelection(state, "a", "agent", 0);
  state = addSelection(state, "b", "agent", 0);
  state = addSelection(state, "a2", "agent", 0);
  assert.throws(() => reorderUpcoming(state, [0, 2, 1], 0), /artist-too-recent/);
  state = replaceUpcoming(state, 1, "c", 0);
  assert.deepEqual(state.upcoming.map((entry) => entry.trackId), ["a", "c"]);
});
