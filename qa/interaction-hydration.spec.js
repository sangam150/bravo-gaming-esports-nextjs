import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

// Actual forms/header with an explicitly paused hydration boundary. All Auth
// transport/context is offline; this is not a real login or staging acceptance.
let render;
let browserScript;
const modes = [
  { name: "admin", email: "Admin email", button: "Sign In", variant: "admin" },
  { name: "hub", email: "Email address", button: "Sign In", variant: "hub" },
  { name: "team", email: "Email address", button: "Open Team Workspace", variant: "team" },
  { name: "player", email: "Email address", button: "Open Player Dashboard", variant: "player" },
];
const components = `
  import AdminLogin from './components/admin/AdminLogin';
  import LoginHubClient from './components/auth/LoginHubClient';
  import SiteHeaderClient from './components/SiteHeaderClient';
  import ContactFormClient from './components/forms/ContactFormClient';
  import TeamRegistrationPageClient from './components/team/TeamRegistrationPageClient';
  function View({mode}){return mode==='header'?<SiteHeaderClient watchLiveHref='/live-stream' account={null}/>:mode==='registration'?<TeamRegistrationPageClient availableTournaments={[]} hasEventQuery={false} selectedTournament={null}/>:mode==='contact'||mode==='feedback'?<ContactFormClient kind={mode} title='QA message' description='Offline fixture only' submitLabel='Send message'/>:mode==='admin'?<AdminLogin/>:<LoginHubClient variant={mode}/>;}
`;
const fixturePlugins = () => [{
  name: "offline-next-context",
  setup(builder) {
    builder.onResolve({ filter: /^\.\/AuthProvider$/ }, args => args.importer.replaceAll("\\", "/").endsWith("/components/admin/AdminLogin.tsx") ? { path: "auth-context", namespace: "hydration-fixture" } : undefined);
    builder.onResolve({ filter: /^(@\/lib\/supabase\/(env|client)|next\/(navigation|image|link))$/ }, args => ({ path: args.path, namespace: "hydration-fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "hydration-fixture" }, args => {
      const modules = {
        "auth-context": `import {performPasswordLogin} from './lib/login-client';export function useAdminAuth(){return {configured:true,async login(email,password){const {response,data}=await performPasswordLogin({email,password,variant:'admin'});if(!response.ok||!data.success)throw Error(data.error);}}}`,
        "@/lib/supabase/env": "export function isSupabaseConfigured(){return true}",
        "@/lib/supabase/client": "export function getSupabaseBrowserClient(){return {auth:{async signOut(){}}}}",
        "next/navigation": "export function usePathname(){return '/'};export function useSearchParams(){return new URLSearchParams('')}",
        "next/link": "export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}",
        "next/image": "export default function Image({fill,priority,sizes,unoptimized,...props}){return <img {...props}/>}",
      };
      return { contents: modules[args.path], loader: "jsx", resolveDir: process.cwd() };
    });
  },
}];

test.beforeAll(async () => {
  const server = await build({
    stdin: { contents: `${components}import {renderToString} from 'react-dom/server';export function render(mode){return renderToString(<View mode={mode}/>);}`, resolveDir: process.cwd(), loader: "tsx" },
    write: false, bundle: true, platform: "node", format: "cjs", jsx: "automatic",
    external: ["react", "react-dom/server", "react/jsx-runtime"], plugins: fixturePlugins(),
  });
  const fixtureModule = { exports: {} };
  new Function("require", "module", "exports", server.outputFiles[0].text)(createRequire(path.resolve("qa/hydration-fixture.cjs")), fixtureModule, fixtureModule.exports);
  render = fixtureModule.exports.render;
  const client = await build({
    stdin: { contents: `${components}import {hydrateRoot} from 'react-dom/client';window.__hydrate=()=>hydrateRoot(document.getElementById('root'),<View mode={window.__mode}/>);`, resolveDir: process.cwd(), loader: "tsx" },
    write: false, bundle: true, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: fixturePlugins(),
  });
  browserScript = client.outputFiles[0].text;
});

async function fixture(page, mode) {
  const writes = [];
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://qa-hydration.test") return route.abort("blockedbyclient");
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><div id="root">${render(mode)}</div><script>window.__mode=${JSON.stringify(mode)}</script><script src="/fixture.js"></script></body></html>` });
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: browserScript });
    if (url.pathname === "/api/auth/providers") return route.fulfill({ json: { discord: false } });
    if (url.pathname === "/api/auth/login") {
      writes.push(request.postDataJSON());
      return route.fulfill({ status: 401, json: { success: false, error: "Invalid email or password. Please check your details and try again." } });
    }
    if (url.pathname === "/api/contact") {
      writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname === "/api/registrations") {
      writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname === "/api/auth/login-events") return route.fulfill({ json: { success: true } });
    if (url.pathname.startsWith("/images/")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>' });
    return route.abort("blockedbyclient");
  });
  await page.goto("http://qa-hydration.test/");
  return writes;
}

for (const mode of modes) test(`${mode.name}: credentials cannot be entered before hydration or lost during activation`, async ({ page }) => {
  const writes = await fixture(page, mode.name);
  const email = page.getByLabel(mode.email, { exact: true });
  const password = page.getByLabel("Password", { exact: true });
  const submit = page.getByRole("button", { name: mode.button, exact: true });
  await expect(email).toBeDisabled();
  await expect(password).toBeDisabled();
  await expect(submit).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page.evaluate(() => window.__hydrate());
  await expect(email).toBeEnabled();
  await expect(password).toBeEnabled();
  await expect(submit).toBeEnabled();
  await email.fill("offline@example.invalid");
  await password.fill("Offline-hydration-fixture-only!");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ email: "offline@example.invalid", password: "Offline-hydration-fixture-only!", variant: mode.variant });
});

test("header: first hydrated mobile click opens the drawer and is not undone by initial pathname setup", async ({ page }) => {
  await fixture(page, "header");
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(menu).toBeDisabled();
  await expect(page.getByRole("button", { name: "Login", exact: true })).toBeDisabled();
  await page.evaluate(() => window.__hydrate());
  await expect(menu).toBeEnabled();
  await menu.click();
  const drawer = page.locator("#mobile-site-navigation");
  await expect(drawer).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
});

for (const kind of ["contact", "feedback"]) test(`${kind}: early submission cannot navigate with private message fields in the URL`, async ({ page }) => {
  const writes = await fixture(page, kind);
  const form = page.locator("form");
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", "/api/contact");
  const fields = form.locator("input, select, textarea, button[type=submit]");
  for (const field of await fields.all()) await expect(field).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page.evaluate(() => window.__hydrate());
  await page.getByLabel("Your name", { exact: true }).fill("Offline fixture sender");
  await page.getByLabel("Email address", { exact: true }).fill("offline@example.invalid");
  await page.getByLabel("Subject", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Message", { exact: true }).fill("Offline private message fixture");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(kind === "feedback" ? "Feedback received" : "Message received");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ kind, name: "Offline fixture sender", email: "offline@example.invalid", message: "Offline private message fixture" });
  await expect(page).toHaveURL("http://qa-hydration.test/");
});

test("registration: delayed hydration cannot lose the roster or submit a native GET", async ({ page }) => {
  const writes = await fixture(page, "registration");
  const form = page.locator("form");
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", "/api/registrations");
  for (const control of await form.locator("input, select, button").all()) await expect(control).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page.evaluate(() => window.__hydrate());
  await page.getByLabel("Team name", { exact: true }).fill("Offline fixture team");
  await page.getByLabel("Team tag or clan code", { exact: true }).fill("QA");
  await page.getByLabel("IGL or manager name", { exact: true }).fill("Offline fixture manager");
  await page.getByLabel("Discord contact", { exact: true }).fill("offline-fixture-discord");
  await page.getByLabel("Player 1 IGN", { exact: true }).fill("Offline fixture player");
  await page.getByRole("button", { name: "Submit Registration", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your team registration has been submitted");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ teamName: "Offline fixture team", teamTag: "QA", captainName: "Offline fixture manager", captainDiscord: "offline-fixture-discord", playerNames: ["Offline fixture player"] });
  await expect(page).toHaveURL("http://qa-hydration.test/");
});
