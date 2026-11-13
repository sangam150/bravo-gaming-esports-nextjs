import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { NextRequest, NextResponse } from "next/server";
import { getLoginFailureResponse } from "../lib/login-failure-response";
import { createSupabaseRequestFetch } from "../lib/supabase/request-fetch";

async function bounded<T>(operation: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Offline timeout check did not settle.")), 1000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkSupabaseFetchTimeouts() {
  const originalFetch = globalThis.fetch;
  const tlsPolicy = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const loggerNames = ["log", "warn", "error", "info", "debug"] as const;
  const loggers = Object.fromEntries(loggerNames.map(name => [name, console[name]]));
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  let logs = 0;
  let timedChecks = 0;
  // Native fetch retains its request signal while a request/body is pending.
  // Keep the same lifetime in this mock: AbortSignal.any uses weak links, so an
  // otherwise unreferenced composed signal can be collected before its timer.
  const pendingSignals = new Set<AbortSignal>();
  const pending: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    assert.ok(signal instanceof AbortSignal);
    if (signal.aborted) reject(signal.reason);
    else {
      pendingSignals.add(signal);
      signal.addEventListener("abort", () => { pendingSignals.delete(signal); reject(signal.reason); }, { once: true });
    }
  });
  const fetchWithDeadline = createSupabaseRequestFetch(15);
  try {
    for (const name of loggerNames) console[name] = () => { logs++; };
    for (const timeout of [0, -1, Infinity, NaN, 1.5]) assert.throws(() => createSupabaseRequestFetch(timeout), RangeError);
    globalThis.fetch = pending;
    const untouchedCaller = new AbortController();
    await assert.rejects(bounded(fetchWithDeadline("https://offline.supabase.co/auth/v1/user", { signal: untouchedCaller.signal })), (error: unknown) => {
      assert.ok(error instanceof DOMException && error.name === "TimeoutError", `Expected a native timeout; got ${error instanceof Error ? `${error.name}: ${error.message}` : typeof error}.`);
      assert.equal(getLoginFailureResponse(error, { variant: "admin" }).status, 503);
      return true;
    });
    assert.equal(untouchedCaller.signal.aborted, false, "A dependency timeout must not abort the caller's own controller.");
    timedChecks++;

    const caller = new AbortController();
    const reason = new Error("offline caller cancellation");
    const cancelled = fetchWithDeadline("https://offline.supabase.co/auth/v1/user", { signal: caller.signal });
    caller.abort(reason);
    await assert.rejects(bounded(cancelled), error => error === reason);
    timedChecks++;

    const requestCaller = new AbortController();
    const requestReason = new Error("offline Request cancellation");
    const request = new Request("https://offline.supabase.co/rest/v1/profiles", { signal: requestCaller.signal });
    const requestCancelled = fetchWithDeadline(request);
    requestCaller.abort(requestReason);
    await assert.rejects(bounded(requestCancelled), error => error === requestReason);
    timedChecks++;

    // Explicit null must override the Request's already-aborted signal while
    // still enforcing this wrapper's independent dependency deadline.
    await assert.rejects(bounded(fetchWithDeadline(request, { signal: null })), { name: "TimeoutError" });
    timedChecks++;

    const alreadyAborted = new AbortController();
    alreadyAborted.abort(reason);
    await assert.rejects(bounded(fetchWithDeadline("https://offline.supabase.co/auth/v1/user", { signal: alreadyAborted.signal })), error => error === reason);
    timedChecks++;

    // A response with stalled bytes must remain bounded after headers arrive.
    globalThis.fetch = async (_input, init) => {
      const signal = init?.signal;
      assert.ok(signal instanceof AbortSignal);
      return new Response(new ReadableStream({ start(controller) {
        if (signal.aborted) controller.error(signal.reason);
        else {
          pendingSignals.add(signal);
          signal.addEventListener("abort", () => { pendingSignals.delete(signal); controller.error(signal.reason); }, { once: true });
        }
      } }));
    };
    const stalled = await fetchWithDeadline("https://offline.supabase.co/auth/v1/user");
    await assert.rejects(bounded(stalled.text()), { name: "TimeoutError" });
    timedChecks++;

    const headerValues = new Headers({ Authorization: "Bearer offline-private", apikey: "offline-public" });
    const payload = "offline-private-body";
    const reply = new Response("ok");
    const override = new AbortController();
    globalThis.fetch = async (input, init) => {
      assert.equal(input, request);
      assert.equal(init?.method, "POST"); assert.equal(init?.body, payload); assert.equal(init?.headers, headerValues);
      assert.equal(init?.credentials, "omit"); assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal && !init.signal.aborted, "RequestInit.signal must retain its native override of Request.signal.");
      assert.equal(Object.hasOwn(init, "agent"), false); assert.equal(Object.hasOwn(init, "dispatcher"), false);
      return reply;
    };
    assert.equal(await fetchWithDeadline(request, { method: "POST", body: payload, headers: headerValues, signal: override.signal, credentials: "omit", cache: "no-store", redirect: "error" }), reply);
    assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED, tlsPolicy);
    assert.equal(logs, 0, "The fetch wrapper must not log credentials, URLs, request bodies or dependency errors.");
    for (const name of loggerNames) console[name] = loggers[name];

    // Real installed SSR/service-role SDK clients must all use the wrapper.
    // Only the Next cookie context is supplied locally; the fetch is intercepted.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-public";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.SUPABASE_SECRET_KEY = "offline-private";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    let sdkRequests = 0;
    globalThis.fetch = async (input, init) => {
      assert.equal(new URL(input instanceof Request ? input.url : String(input)).origin, "https://offline.supabase.co");
      assert.ok(init?.signal instanceof AbortSignal && !init.signal.aborted, "Server SDK requests need a live composed deadline.");
      sdkRequests++;
      return Response.json([]);
    };
    const directory = resolve("qa-artifacts/blocker-recheck");
    const outfile = resolve(directory, "server-fetch-fixture.mjs");
    await mkdir(directory, { recursive: true });
    await build({
      stdin: { contents: "export {createSupabaseServerClient,createSupabaseRouteClient} from './lib/supabase/server'; export {getSupabaseServiceRoleClient} from './lib/supabase/service-role-client';", resolveDir: process.cwd(), loader: "ts" },
      outfile, bundle: true, platform: "node", format: "esm", external: ["@supabase/ssr", "@supabase/supabase-js"],
      plugins: [{ name: "offline-server-context", setup(builder) {
        builder.onResolve({ filter: /^(server-only|next\/headers)$/ }, args => ({ path: args.path, namespace: "offline-context" }));
        builder.onLoad({ filter: /.*/, namespace: "offline-context" }, args => ({ contents: args.path === "server-only" ? "" : "export async function cookies(){return {getAll:()=>[],set(){}};}", loader: "js" }));
      } }],
    });
    const clients = await import(pathToFileURL(outfile).href) as typeof import("../lib/supabase/server") & typeof import("../lib/supabase/service-role-client");
    const server = await clients.createSupabaseServerClient();
    assert.equal((await server.from("profiles").select("id").limit(0)).error, null);
    const route = clients.createSupabaseRouteClient(new NextRequest("https://bravo.example/"), NextResponse.next());
    assert.equal((await route.from("profiles").select("id").limit(0)).error, null);
    const service = clients.getSupabaseServiceRoleClient();
    assert.equal((await service.from("profiles").select("id").limit(0)).error, null);
    assert.equal(sdkRequests, 3);
    assert.equal(pendingSignals.size, 0);
    console.log(`Offline Supabase fetch QA passed: ${timedChecks} deadline/cancellation checks, bounded response body, unchanged TLS/options, no credential logs and three installed SDK server clients. No real service contacted.`);
  } finally {
    globalThis.fetch = originalFetch;
    pendingSignals.clear();
    for (const name of loggerNames) console[name] = loggers[name];
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
}
