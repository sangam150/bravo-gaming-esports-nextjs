import { test, expect } from "@playwright/test";
import { build } from "esbuild";

// Isolated browser regressions for the actual provider/gate/client helpers.
// Every response is intercepted; this is never reported as staging acceptance.
let script;
test.beforeAll(async () => {
  const result = await build({
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    stdin: {
      resolveDir: process.cwd(),
      sourcefile: "auth-harness.tsx",
      loader: "tsx",
      contents: `
      import {createRoot} from 'react-dom/client';
      import {useState} from 'react';
      import AuthProvider,{useAdminAuth} from './components/admin/AuthProvider';
      import AdminGate from './components/admin/AdminGate';
      import {adminFetch} from './lib/admin-api';
      function Harness(){const auth=useAdminAuth();const [error,setError]=useState('');const [result,setResult]=useState('');return <>
        <output data-testid="role">{auth.role||'none'}</output><output data-testid="user">{auth.user?.id||'none'}</output>
        <button onClick={()=>auth.login('offline@example.invalid','Offline-test-password').catch(e=>setError(e.message))}>Login test account</button>
        <button onClick={()=>void auth.logout()}>Logout test account</button>
        <button onClick={()=>adminFetch('/api/admin/test').then(data=>setResult(data.value)).catch(e=>setError(e.message))}>Read protected API</button>
        <p data-testid="action-error">{error}</p><p data-testid="api-result">{result}</p>
        <AdminGate><h1>Protected workspace</h1></AdminGate></>}
      createRoot(document.getElementById('root')).render(<AuthProvider><Harness/></AuthProvider>);
    `,
    },
    plugins: [
      {
        name: "offline-auth-dependencies",
        setup(builder) {
          builder.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({ path: "sdk", namespace: "offline" }));
          builder.onResolve({ filter: /^@\/lib\/supabase\/env$/ }, () => ({ path: "environment", namespace: "offline" }));
          builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "offline" }));
          builder.onResolve({ filter: /^\.\/AdminLogin$/ }, () => ({ path: "login", namespace: "offline" }));
          builder.onLoad({ filter: /.*/, namespace: "offline" }, (args) => {
            const modules = {
              sdk: `let callback;window.__sdkReads=0;window.__emitSDK=(event,session)=>callback?.(event,session);export function getSupabaseBrowserClient(){return {auth:{getSession(){window.__sdkReads++;throw Error('Cached SDK session must not authorize admin calls')},onAuthStateChange(cb){callback=cb;setTimeout(()=>cb('INITIAL_SESSION',null),0);return {data:{subscription:{unsubscribe(){callback=undefined}}}}},async signOut(){callback?.('SIGNED_OUT',null)}}}}`,
              environment: "export function isSupabaseConfigured(){return true}",
              navigation: "export function usePathname(){return '/admin'}",
              login: "export default function AdminLogin(){return 'Login required'}",
            };
            return { contents: modules[args.path], loader: "js", resolveDir: process.cwd() };
          });
        },
      },
    ],
  });
  script = result.outputFiles[0].text;
});

const admin = { uid: "offline-admin", role: "admin", isAdmin: true, email: "offline@example.invalid" };
async function fixture(context, initial = null) {
  const server = { user: initial, unavailable: false, logoutFails: false, loginFails: false, sessionPosts: 0, requests: [] };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/")
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
      });
    if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/api/auth/me")
      return route.fulfill({ status: server.unavailable ? 503 : 200, json: { authenticated: Boolean(server.user), user: server.user } });
    if (path === "/api/auth/login") {
      if (server.loginFails)
        return route.fulfill({ status: 401, json: { success: false, error: "Invalid login credentials", status: 401 } });
      server.user = admin;
      return route.fulfill({ json: { success: true, user: admin } });
    }
    if (path === "/api/auth/session") {
      if (request.method() === "POST") {
        server.sessionPosts++;
        return route.fulfill({ status: 500, json: { error: "Competing token synchronization is forbidden in this regression" } });
      }
      if (server.logoutFails) return route.fulfill({ status: 503, json: { success: false } });
      server.user = null;
      return route.fulfill({ json: { success: true } });
    }
    if (path === "/api/admin/test") {
      server.requests.push(request.headers());
      return route.fulfill({ json: { value: "server-cookie-request" } });
    }
    return route.abort("blockedbyclient");
  });
  return server;
}

test("server login survives a stale browser session and uses cookies for admin APIs", async ({ context, page }) => {
  const server = await fixture(context);
  await page.goto("http://qa-auth.test/");
  await expect(page.getByText("Login required", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Login test account" }).click();
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
  await page.evaluate(() => window.__emitSDK("TOKEN_REFRESHED", { user: { id: "stale-browser-user" }, access_token: "stale-token" }));
  await expect(page.getByTestId("user")).toHaveText("offline-admin");
  await page.getByRole("button", { name: "Read protected API" }).click();
  await expect(page.getByTestId("api-result")).toHaveText("server-cookie-request");
  expect(server.requests[0].authorization).toBeUndefined();
  expect(server.sessionPosts).toBe(0);
  expect(await page.evaluate(() => window.__sdkReads)).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
});

test("logout reconciles tabs and does not trust a storage role", async ({ context, page }) => {
  await fixture(context, admin);
  await page.goto("http://qa-auth.test/");
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
  const other = await context.newPage();
  await other.goto("http://qa-auth.test/");
  await expect(other.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Logout test account" }).click();
  await expect(other.getByText("Login required", { exact: true })).toBeVisible();
  await other.evaluate(() => localStorage.setItem("bravo-session-revision", JSON.stringify({ role: "super_admin" })));
  await expect(page.getByTestId("role")).toHaveText("none");
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toHaveCount(0);
});

test("viewer/expired sessions fail closed and outages expose a retry", async ({ context, page }) => {
  const server = await fixture(context, { ...admin, role: "viewer", isAdmin: false });
  await page.goto("http://qa-auth.test/");
  await expect(page.getByRole("heading", { name: "Admin Access Required" })).toBeVisible();
  server.user = null;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Login required", { exact: true })).toBeVisible();
  server.unavailable = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("alert")).toContainText("Session verification is temporarily unavailable");
  server.unavailable = false;
  server.user = admin;
  await page.getByRole("button", { name: "Retry session check" }).click();
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
});

test("failed logout is reported rather than claiming access was terminated", async ({ context, page }) => {
  const server = await fixture(context, admin);
  await page.goto("http://qa-auth.test/");
  await expect(page.getByRole("heading", { name: "Protected workspace" })).toBeVisible();
  server.logoutFails = true;
  await page.getByRole("button", { name: "Logout test account" }).click();
  await expect(page.getByRole("alert")).toContainText("Sign-out could not be confirmed");
  expect(server.user).toEqual(admin);
});
