import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncOnce } from "./sync.ts";
import type { EventState } from "./event.ts";

test("mixer markers update durable history once, including fallback playback", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-sync-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "prepared", plannedEndMs: 100_000, eventBrief: "House",
    steering: [], speechMuted: false, pool: [
      { id: "a", artistId: "a", artist: "A", title: "A", durationMs: 30_000, localPath: "/music/a.mp3" },
      { id: "b", artistId: "b", artist: "B", title: "B", durationMs: 30_000, localPath: "/music/b.mp3" },
    ], fallbackOrder: ["a", "b"], history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  await writeFile(join(directory, "now-playing.json"), JSON.stringify({ filename: "/music/a.mp3", startedAt: 10 }));
  assert.equal(await syncOnce(directory), true);
  assert.equal(await syncOnce(directory), false);
  await writeFile(join(directory, "now-playing.json"), JSON.stringify({ filename: "/music/b.mp3", startedAt: 40 }));
  assert.equal(await syncOnce(directory), true);
  const saved = JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState;
  assert.equal(saved.current?.trackId, "b");
  assert.deepEqual(saved.history.map((entry) => entry.trackId), ["a"]);
});
