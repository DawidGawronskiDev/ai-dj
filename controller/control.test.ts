import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { control, recoverOnStartup } from "./control.ts";
import type { EventState } from "./event.ts";

test("a machine reboot pauses playback, records the interrupted track, and needs resume", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-reboot-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "running", plannedEndMs: Date.now() + 100_000, eventBrief: "House",
    steering: [], speechMuted: false,
    pool: [{ id: "a", artistId: "a", artist: "A", title: "A", durationMs: 30_000, localPath: "/music/a.mp3" }],
    fallbackOrder: ["a"], history: [], current: { trackId: "a", startedAtMs: Date.now() - 5_000 },
    upcoming: [{ trackId: "a", source: "agent", reason: "stale", protected: false, committed: false }], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  await writeFile(join(directory, "run.flag"), "previous-boot\n");
  await writeFile(join(directory, "now-playing.json"), JSON.stringify({ filename: "/music/a.mp3", startedAt: 1 }));
  const paused = await recoverOnStartup(directory, "new-boot");
  assert.equal(paused.status, "paused");
  assert.equal(paused.current, null);
  assert.deepEqual(paused.upcoming, []);
  assert.deepEqual(paused.history.map((entry) => entry.trackId), ["a"]);
  await assert.rejects(readFile(join(directory, "run.flag")), { code: "ENOENT" });
  await assert.rejects(readFile(join(directory, "now-playing.json")), { code: "ENOENT" });
});

test("a controller restart on the same boot leaves playback running", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-service-restart-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "running", plannedEndMs: Date.now() + 100_000, eventBrief: "House",
    steering: [], speechMuted: false, pool: [], fallbackOrder: [], history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  await writeFile(join(directory, "run.flag"), "same-boot\n");
  assert.equal((await recoverOnStartup(directory, "same-boot")).status, "running");
  assert.equal(await readFile(join(directory, "run.flag"), "utf8"), "same-boot\n");
});

test("resume requires a paused event and writes the current boot marker", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-resume-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "paused", plannedEndMs: Date.now() + 100_000, eventBrief: "House",
    steering: [], speechMuted: false, pool: [], fallbackOrder: [], history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  await assert.rejects(control(directory, "start"), /Only a prepared event/);
  await control(directory, "resume");
  const boot = (await readFile("/proc/sys/kernel/random/boot_id", "utf8")).trim();
  assert.equal((await readFile(join(directory, "run.flag"), "utf8")).trim(), boot);
  assert.equal((JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState).status, "running");
});

test("stop closes the playing track in history and clears the run flag", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-stop-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "running", plannedEndMs: Date.now() + 100_000, eventBrief: "House",
    steering: [], speechMuted: false,
    pool: [{ id: "a", artistId: "a", artist: "A", title: "A", durationMs: 30_000, localPath: "/music/a.mp3" }],
    fallbackOrder: ["a"], history: [], current: { trackId: "a", startedAtMs: Date.now() - 5_000 }, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  await writeFile(join(directory, "run.flag"), "boot\n");
  await control(directory, "stop");
  const stopped = JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState;
  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.current, null);
  assert.deepEqual(stopped.history.map((entry) => entry.trackId), ["a"]);
  await assert.rejects(readFile(join(directory, "run.flag")), { code: "ENOENT" });
});
