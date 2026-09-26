import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createControllerServer } from "./serve.ts";
import type { EventState } from "./event.ts";

test("authenticated commands publish only validated, protected queue choices", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-server-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const pool = ["a", "b", "c"].map((id) => ({ id, artistId: id, artist: id, title: id, durationMs: 60 * 60_000, localPath: `/music/${id}.mp3` }));
  const state: EventState = {
    id: "night", status: "prepared", plannedEndMs: Date.now() + 4 * 60 * 60_000,
    eventBrief: "House", steering: [], speechMuted: false, pool, fallbackOrder: ["a", "b", "c"],
    history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  const { server, ready } = createControllerServer(directory, "secret");
  context.after(() => { server.close(); });
  await ready;
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  const url = `http://127.0.0.1:${address.port}`;
  const post = (path: string, body: object) => fetch(`${url}${path}`, {
    method: "POST", headers: { authorization: "Bearer secret", "content-type": "application/json" }, body: JSON.stringify(body),
  });
  assert.equal((await fetch(`${url}/state`)).status, 401);
  assert.equal((await post("/queue", { trackId: "outside", source: "agent" })).status, 400);
  assert.equal((await post("/force-next", { trackId: "a", operatorOverride: { allowRepeats: true } })).status, 400);
  assert.equal((await post("/queue", { trackId: "b", source: "agent" })).status, 200);
  assert.equal((await post("/force-next", { trackId: "c" })).status, 200);
  assert.equal((await post("/steer", { instruction: "More upbeat" })).status, 200);
  const saved = JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState;
  assert.deepEqual(saved.upcoming.map((entry) => entry.trackId), ["c"]);
  assert.equal(saved.upcoming[0]?.protected, true);
  assert.equal(await readFile(join(directory, "schedule.m3u"), "utf8"), "/music/c.mp3\n/music/a.mp3\n/music/b.mp3\n");
});

test("background selector fills two validated slots without blocking the controller", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-auto-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const pool = ["a", "b", "c"].map((id) => ({ id, artistId: id, artist: id, title: id, durationMs: 60 * 60_000, localPath: `/music/${id}.mp3` }));
  const state: EventState = {
    id: "night", status: "prepared", plannedEndMs: Date.now() + 4 * 60 * 60_000,
    eventBrief: "House", steering: [], speechMuted: false, pool, fallbackOrder: ["a", "b", "c"],
    history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  let calls = 0;
  let signalStarted!: () => void;
  let releaseFirst!: () => void;
  const started = new Promise<void>((done) => { signalStarted = done; });
  const firstHeld = new Promise<void>((done) => { releaseFirst = done; });
  const fetcher = (async () => {
    calls++;
    if (calls === 1) { signalStarted(); await firstHeld; }
    return Response.json({ status: "completed", output: [{
      type: "function_call", call_id: `call_${calls}`, name: "submit_selection",
      arguments: JSON.stringify({ trackId: calls === 1 ? "b" : "c", reason: "Fits the event brief" }),
    }] });
  }) as typeof fetch;
  const { server, ready } = createControllerServer(directory, "secret", { apiKey: "test", fetcher });
  context.after(() => { server.close(); });
  await ready;
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  await started;
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/state`, {
      headers: { authorization: "Bearer secret" }, signal: AbortSignal.timeout(500),
    });
    assert.equal(response.status, 200);
  } finally { releaseFirst(); }
  let saved = state;
  for (let attempt = 0; attempt < 200; attempt++) {
    saved = JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState;
    if (saved.upcoming.length === 2) break;
    await new Promise((done) => setTimeout(done, 25));
  }
  assert.deepEqual(saved.upcoming.map((entry) => entry.trackId), ["b", "c"]);
  assert.deepEqual(saved.upcoming.map((entry) => entry.source), ["agent", "agent"]);
  assert.equal(await readFile(join(directory, "schedule.m3u"), "utf8"), "/music/b.mp3\n/music/c.mp3\n/music/a.mp3\n");
});

test("model failure leaves the local fallback schedule available", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-dj-auto-fail-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(directory, { recursive: true, force: true }); });
  const state: EventState = {
    id: "night", status: "prepared", plannedEndMs: Date.now() + 4 * 60 * 60_000,
    eventBrief: "House", steering: [], speechMuted: false,
    pool: ["a", "b"].map((id) => ({ id, artistId: id, artist: id, title: id, durationMs: 60 * 60_000, localPath: `/music/${id}.mp3` })),
    fallbackOrder: ["a", "b"], history: [], current: null, upcoming: [], warnings: [],
  };
  await writeFile(join(directory, "event.json"), JSON.stringify(state));
  const fetcher = (async () => { throw new Error("simulated outage"); }) as typeof fetch;
  const { server, ready } = createControllerServer(directory, "secret", { apiKey: "test", fetcher });
  context.after(() => { server.close(); });
  await ready;
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  let saved = state;
  for (let attempt = 0; attempt < 80; attempt++) {
    saved = JSON.parse(await readFile(join(directory, "event.json"), "utf8")) as EventState;
    if (saved.warnings.length) break;
    await new Promise((done) => setTimeout(done, 25));
  }
  assert.deepEqual(saved.upcoming, []);
  assert.ok(saved.warnings.includes("AI selection unavailable; local fallback remains active"));
  assert.equal(await readFile(join(directory, "schedule.m3u"), "utf8"), "/music/a.mp3\n/music/b.mp3\n");
});
