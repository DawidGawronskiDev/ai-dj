import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import {
  addSelection, buildSchedule, eligibleCandidates, forceNext, reorderUpcoming, replaceUpcoming, steer,
  type EventState, type QueueEntry,
} from "./event.ts";
import { atomicWrite } from "./prepare.ts";
import { syncOnce } from "./sync.ts";
import { control, recoverOnStartup } from "./control.ts";
import { applySelectionIfCurrent, selectTrack, type SelectorConfig } from "./selection.ts";

type Body = Record<string, unknown>;

function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

function authenticated(request: IncomingMessage, password: string): boolean {
  const supplied = request.headers.authorization;
  if (typeof supplied !== "string" || !supplied.startsWith("Bearer ")) return false;
  const received = Buffer.from(supplied.slice(7));
  const expected = Buffer.from(password);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function readBody(request: IncomingMessage): Promise<Body> {
  let content = "";
  for await (const chunk of request) {
    content += String(chunk);
    if (content.length > 65_536) throw new Error("Request body is too large");
  }
  const parsed = content ? JSON.parse(content) as unknown : {};
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object");
  return parsed as Body;
}

function requiredString(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} must be a nonempty string`);
  return value;
}

function override(body: Body): QueueEntry["operatorOverride"] {
  if (body.operatorOverride === undefined) return undefined;
  const value = body.operatorOverride;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("operatorOverride must be an object");
  const input = value as Record<string, unknown>;
  if (input.allowRepeats !== undefined && typeof input.allowRepeats !== "boolean") throw new Error("allowRepeats must be boolean");
  if (input.allowArtistSpacing !== undefined && typeof input.allowArtistSpacing !== "boolean") throw new Error("allowArtistSpacing must be boolean");
  if (input.allowRepeats) throw new Error("allowRepeats is unavailable in the venue audio pipeline");
  return { allowRepeats: input.allowRepeats as boolean | undefined, allowArtistSpacing: input.allowArtistSpacing as boolean | undefined };
}

async function loadState(stateDirectory: string): Promise<EventState> {
  return JSON.parse(await readFile(resolve(stateDirectory, "event.json"), "utf8")) as EventState;
}

async function publish(stateDirectory: string, state: EventState): Promise<void> {
  const paths = buildSchedule(state, Date.now());
  await atomicWrite(resolve(stateDirectory, "planned-end.txt"), `${state.plannedEndMs / 1000}\n`);
  await atomicWrite(resolve(stateDirectory, "schedule.m3u"), paths.join("\n") + (paths.length ? "\n" : ""));
}

export function createControllerServer(stateDirectory: string, password: string, selectorConfig?: SelectorConfig) {
  if (!password) throw new Error("OPERATOR_PASSWORD is required");
  let tail: Promise<void> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.then(() => {}, () => {});
    return result;
  };
  const timer = setInterval(() => {
    void serial(async () => {
      const changed = await syncOnce(stateDirectory);
      const state = await loadState(stateDirectory);
      if (state.status === "running" && Date.now() >= Math.max(state.plannedEndMs,
          state.current ? state.current.startedAtMs + (state.pool.find((track) => track.id === state.current!.trackId)?.durationMs ?? 0) + 1_000 : 0)) {
        await control(stateDirectory, "stop");
        await publish(stateDirectory, await loadState(stateDirectory));
      } else if (changed || state.status === "running") {
        await publish(stateDirectory, state);
      }
    }).catch((error: unknown) => console.error("Controller sync failed:", error));
  }, 500);
  let selectorTimer: NodeJS.Timeout | undefined;
  let closed = false;
  let selecting = false;
  let nextSelectionMs = 0;
  let retryMs = 5_000;
  const noteWarning = async (warning: string): Promise<void> => {
    if (closed) return;
    await serial(async () => {
      const state = await loadState(stateDirectory);
      if (state.status === "stopped" || state.warnings.includes(warning)) return;
      await atomicWrite(resolve(stateDirectory, "event.json"), JSON.stringify({
        ...state, warnings: [...state.warnings, warning],
      }, null, 2) + "\n");
    });
  };
  const maybeSelect = async (): Promise<void> => {
    if (closed || !selectorConfig?.apiKey || selecting || Date.now() < nextSelectionMs) return;
    selecting = true;
    try {
      const snapshot = await serial(() => loadState(stateDirectory));
      const nowMs = Date.now();
      if ((snapshot.status !== "prepared" && snapshot.status !== "running") ||
          snapshot.upcoming.length >= 2 || nowMs >= snapshot.plannedEndMs) return;
      if (!eligibleCandidates(snapshot, nowMs).length) {
        await noteWarning("No eligible track can start before the planned end");
        nextSelectionMs = Date.now() + 30_000;
        return;
      }
      const choice = await selectTrack(snapshot, selectorConfig, nowMs);
      if (closed) return;
      await serial(async () => {
        const current = await loadState(stateDirectory);
        const updated = applySelectionIfCurrent(snapshot, current, choice, Date.now());
        if (!updated) return;
        await atomicWrite(resolve(stateDirectory, "event.json"), JSON.stringify(updated, null, 2) + "\n");
        await publish(stateDirectory, updated);
      });
      retryMs = 5_000;
      nextSelectionMs = Date.now() + 1_000;
    } catch (error) {
      console.error("Autonomous selection failed:", error instanceof Error ? error.message : "Unknown error");
      await noteWarning("AI selection unavailable; local fallback remains active").catch((warningError: unknown) => console.error(warningError));
      nextSelectionMs = Date.now() + retryMs;
      retryMs = Math.min(60_000, retryMs * 2);
    } finally {
      selecting = false;
    }
  };
  const server = createServer((request, response) => {
    if (!authenticated(request, password)) { send(response, 401, { error: "Unauthorized" }); return; }
    void serial(async () => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (request.method === "GET" && path === "/state") { send(response, 200, await loadState(stateDirectory)); return; }
      if (request.method !== "POST") { send(response, 404, { error: "Unknown endpoint" }); return; }
      const body = await readBody(request);
      if (path === "/start" || path === "/resume" || path === "/stop") {
        await control(stateDirectory, path === "/start" ? "start" : path === "/resume" ? "resume" : "stop");
        const updated = await loadState(stateDirectory);
        if (path === "/stop") await publish(stateDirectory, updated);
        send(response, 200, updated);
        return;
      }
      const state = await loadState(stateDirectory);
      const nowMs = Date.now();
      let updated: EventState;
      if (path === "/skip") {
        if (state.status !== "running" || !state.current) throw new Error("Cannot skip without a playing track");
        await atomicWrite(resolve(stateDirectory, "skip.request"), `${nowMs}\n`);
        send(response, 202, state);
        return;
      } else if (path === "/queue") {
        const source = body.source;
        if (source !== "agent" && source !== "operator") throw new Error("source must be agent or operator");
        updated = addSelection(state, requiredString(body, "trackId"), source, nowMs,
          typeof body.reason === "string" ? body.reason : "", override(body));
      } else if (path === "/force-next") {
        updated = forceNext(state, requiredString(body, "trackId"), nowMs, override(body));
      } else if (path === "/replace") {
        updated = replaceUpcoming(state, Number(body.index), requiredString(body, "trackId"), nowMs, override(body));
      } else if (path === "/reorder") {
        if (!Array.isArray(body.order) || !body.order.every((value) => Number.isInteger(value))) throw new Error("order must be an array of indices");
        updated = reorderUpcoming(state, body.order as number[], nowMs);
      } else if (path === "/steer") {
        updated = steer(state, requiredString(body, "instruction"));
      } else if (path === "/mute") {
        if (typeof body.muted !== "boolean") throw new Error("muted must be boolean");
        updated = { ...state, speechMuted: body.muted };
      } else if (path === "/extend") {
        const plannedEndMs = Number(body.plannedEndMs);
        if (!Number.isFinite(plannedEndMs) || plannedEndMs <= state.plannedEndMs) throw new Error("plannedEndMs must extend the event");
        updated = { ...state, plannedEndMs };
      } else {
        send(response, 404, { error: "Unknown endpoint" });
        return;
      }
      await atomicWrite(resolve(stateDirectory, "event.json"), JSON.stringify(updated, null, 2) + "\n");
      await publish(stateDirectory, updated);
      send(response, 200, updated);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      send(response, error instanceof SyntaxError || message.startsWith("Track is ineligible") || message.startsWith("Invalid") || message.startsWith("Cannot skip") || message.startsWith("Only a") || message.startsWith("Planned end") || message.startsWith("allowRepeats") || message.includes("must be") || message.includes("committed") ? 400 : 500, { error: message });
    });
  });
  server.on("close", () => { closed = true; clearInterval(timer); if (selectorTimer) clearInterval(selectorTimer); });
  const ready = serial(async () => {
    await recoverOnStartup(stateDirectory);
    await syncOnce(stateDirectory);
    await publish(stateDirectory, await loadState(stateDirectory));
  });
  if (selectorConfig?.apiKey) void ready.then(() => {
    if (closed) return;
    selectorTimer = setInterval(() => { void maybeSelect(); }, 2_000);
    void maybeSelect();
  }).catch(() => {});
  return { server, ready };
}

if (process.argv[1]?.endsWith("/controller/serve.ts")) {
  const stateDirectory = process.argv[2];
  const password = process.env.OPERATOR_PASSWORD;
  if (!stateDirectory || !password) {
    console.error("Usage: OPERATOR_PASSWORD=... node controller/serve.ts <state-directory>");
    process.exitCode = 1;
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    const { server, ready } = createControllerServer(stateDirectory, password,
      apiKey ? { apiKey, model: process.env.OPENAI_MODEL || "gpt-6-luna" } : undefined);
    ready.then(() => server.listen(Number(process.env.CONTROLLER_PORT ?? 8787), "0.0.0.0"))
      .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
