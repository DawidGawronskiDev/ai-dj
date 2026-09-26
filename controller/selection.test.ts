import assert from "node:assert/strict";
import test from "node:test";
import { applySelectionIfCurrent, selectTrack } from "./selection.ts";
import { forceNext, steer, type EventState } from "./event.ts";

const now = Date.now();
function event(): EventState {
  const pool = ["a", "b", "c"].map((id) => ({ id, artistId: id, artist: id, title: id, durationMs: 60_000, localPath: `/music/${id}.mp3` }));
  return {
    id: "night", status: "prepared", plannedEndMs: now + 300_000, eventBrief: "Warm house",
    steering: ["More vocal"], speechMuted: false, pool, fallbackOrder: ["a", "b", "c"],
    history: [], current: null, upcoming: [], warnings: [],
  };
}

function call(name: string, args: object, number: number) {
  return { type: "function_call", call_id: `call_${number}`, name, arguments: JSON.stringify(args) };
}

test("Responses tools expose only approved metadata and return a validated choice", async () => {
  const calls = [
    call("search_pool", { query: "", offset: 0, limit: 10 }, 1),
    call("inspect_tracks", { trackIds: ["b"] }, 2),
    call("read_history", {}, 3),
    call("submit_selection", { trackId: "b", reason: "Fits the warm opening" }, 4),
  ];
  let index = 0;
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.model, "gpt-6-luna");
    assert.equal(body.store, false);
    assert.equal(body.parallel_tool_calls, false);
    const input = body.input as Array<Record<string, unknown>>;
    if (index === 1) {
      const result = JSON.parse(String(input.at(-1)?.output)) as { tracks: Array<Record<string, unknown>> };
      assert.deepEqual(result.tracks.map((track) => track.id), ["a", "b", "c"]);
      assert.equal("localPath" in result.tracks[0]!, false);
    }
    return Response.json({ status: "completed", output: [calls[index++]!] });
  }) as typeof fetch;
  assert.deepEqual(await selectTrack(event(), { apiKey: "test", fetcher }, now), {
    trackId: "b", reason: "Fits the warm opening",
  });
  assert.equal(index, 4);
});

test("model cannot submit a track outside the frozen pool", async () => {
  const fetcher = (async () => Response.json({ status: "completed", output: [
    call("submit_selection", { trackId: "outside", reason: "Try it" }, 1),
  ] })) as typeof fetch;
  await assert.rejects(selectTrack(event(), { apiKey: "test", fetcher }, now), /outside-event-pool/);
});

test("selection stops after six tool calls", async () => {
  let calls = 0;
  const fetcher = (async () => Response.json({ status: "completed", output: [
    call("search_pool", { query: "", offset: 0, limit: 1 }, ++calls),
  ] })) as typeof fetch;
  await assert.rejects(selectTrack(event(), { apiKey: "test", fetcher }, now), /six tool calls/);
  assert.equal(calls, 6);
});

test("late model results cannot overwrite operator changes or steering", () => {
  const snapshot = event();
  const choice = { trackId: "b", reason: "Warm opening" };
  assert.equal(applySelectionIfCurrent(snapshot, steer(snapshot, "Play faster"), choice, now), null);
  assert.equal(applySelectionIfCurrent(snapshot, forceNext(snapshot, "a", now), choice, now), null);
  assert.deepEqual(applySelectionIfCurrent(snapshot, snapshot, choice, now)?.upcoming.map((entry) => entry.trackId), ["b"]);
});
