import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import {
  addSelection, buildSchedule, forceNext, reorderUpcoming, replaceUpcoming, steer,
  type EventState, type QueueEntry,
} from "./event.ts";
import { atomicWrite } from "./prepare.ts";
import { syncOnce } from "./sync.ts";
import { control } from "./control.ts";

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
  await atomicWrite(resolve(stateDirectory, "schedule.m3u"), paths.join("\n") + (paths.length ? "\n" : ""));
}

export function createControllerServer(stateDirectory: string, password: string) {
  if (!password) throw new Error("OPERATOR_PASSWORD is required");
  let tail: Promise<void> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.then(() => {}, () => {});
    return result;
  };
  const timer = setInterval(() => {
    void serial(async () => {
      if (await syncOnce(stateDirectory)) await publish(stateDirectory, await loadState(stateDirectory));
    }).catch((error: unknown) => console.error("Controller sync failed:", error));
  }, 500);
  const server = createServer((request, response) => {
    if (!authenticated(request, password)) { send(response, 401, { error: "Unauthorized" }); return; }
    void serial(async () => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (request.method === "GET" && path === "/state") { send(response, 200, await loadState(stateDirectory)); return; }
      if (request.method !== "POST") { send(response, 404, { error: "Unknown endpoint" }); return; }
      const body = await readBody(request);
      if (path === "/start" || path === "/stop") {
        await control(stateDirectory, path === "/start" ? "start" : "stop");
        send(response, 200, await loadState(stateDirectory));
        return;
      }
      const state = await loadState(stateDirectory);
      const nowMs = Date.now();
      let updated: EventState;
      if (path === "/queue") {
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
      send(response, error instanceof SyntaxError || message.startsWith("Track is ineligible") || message.startsWith("Invalid") || message.startsWith("allowRepeats") || message.includes("must be") || message.includes("committed") ? 400 : 500, { error: message });
    });
  });
  server.on("close", () => clearInterval(timer));
  return { server, ready: serial(async () => {
    await syncOnce(stateDirectory);
    await publish(stateDirectory, await loadState(stateDirectory));
  }) };
}

if (process.argv[1]?.endsWith("/controller/serve.ts")) {
  const stateDirectory = process.argv[2];
  const password = process.env.OPERATOR_PASSWORD;
  if (!stateDirectory || !password) {
    console.error("Usage: OPERATOR_PASSWORD=... node controller/serve.ts <state-directory>");
    process.exitCode = 1;
  } else {
    const { server, ready } = createControllerServer(stateDirectory, password);
    ready.then(() => server.listen(Number(process.env.CONTROLLER_PORT ?? 8787), "0.0.0.0"))
      .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
