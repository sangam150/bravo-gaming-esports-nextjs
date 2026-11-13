import { expect, test } from "@playwright/test";
import { build } from "esbuild";

// Actual controlled slot editor/helpers; local state and clipboard are fixtures.
// No real account, registration, saved database state or OBS acceptance is claimed.
let script;
test.beforeAll(async () => {
  const result = await build({ bundle: true, write: false, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, stdin: { sourcefile: "scrim-slot-fixture.tsx", loader: "tsx", resolveDir: process.cwd(), contents: `
    import {createRoot} from 'react-dom/client';import {useState} from 'react';
    import ScrimSlotEditor from './components/admin/ScrimSlotEditor';
    import {toggleScrimTeamConfirmation} from './lib/scrim-slots';
    const teams=[{id:'a',name:'Offline Alpha'},{id:'b',name:'Offline Bravo'},{id:'c',name:'Offline Charlie'}];
    const initial={id:'fixture',title:'Offline slot fixture',date:'2026-11-06',map:'Rondo',lobbyTime:'7:00 PM NPT',status:'scheduled',teamIds:['a','b','c'],teamCapacity:16,slotAssignments:[{teamId:'a',slotNumber:7}],slotsLocked:false,roomId:'private-fixture-room',roomPassword:'private-fixture-password'};
    function Harness(){const [value,setValue]=useState(initial);const [saved,setSaved]=useState(initial);const [message,setMessage]=useState('');return <>
      <ScrimSlotEditor value={value} saved={saved} teams={teams} onChange={setValue}/>
      <button onClick={()=>setValue(toggleScrimTeamConfirmation(value,'a'))}>Toggle Alpha confirmation</button>
      <button onClick={()=>{setSaved(structuredClone(value));setMessage('Fixture save acknowledgement')}}>Acknowledge fixture save</button>
      <p data-testid='saved-state'>{message}</p><pre data-testid='state'>{JSON.stringify(value)}</pre>
    </>};createRoot(document.getElementById('root')).render(<Harness/>);
  ` } });
  script = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__copiedSlots = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { async writeText(value) { if (window.__denyClipboard) throw Error("Clipboard denied"); window.__copiedSlots.push(value); } } });
  });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://scrim-slots.test") return route.abort("blockedbyclient");
    return url.pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: script }) : route.fulfill({ contentType: "text/html", body: '<!doctype html><html><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
  });
  await page.goto("http://scrim-slots.test/");
});

test("actual editor preserves occupied slots, manually reassigns and locks controls", async ({ page }) => {
  await page.getByRole("button", { name: "Assign available slots", exact: true }).click();
  await expect(page.getByLabel("Slot for Offline Alpha", { exact: true })).toHaveValue("7");
  await expect(page.getByLabel("Slot for Offline Bravo", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Slot for Offline Charlie", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Slot for Offline Bravo", { exact: true }).locator('option[value="7"]')).toHaveJSProperty("disabled", true);
  await page.getByLabel("Slot for Offline Bravo", { exact: true }).selectOption("4");
  await expect(page.getByLabel("Slot for Offline Bravo", { exact: true })).toHaveValue("4");
  await page.getByLabel("Lock confirmed slots", { exact: true }).check();
  await expect(page.getByLabel("Slot for Offline Alpha", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Scrim team capacity", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Assign available slots", exact: true })).toBeDisabled();
  await page.getByLabel("Lock confirmed slots", { exact: true }).uncheck();
  await expect(page.getByLabel("Slot for Offline Alpha", { exact: true })).toBeEnabled();
});

test("actual confirmation helper releases a withdrawn team's slot for reassignment", async ({ page }) => {
  await page.getByRole("button", { name: "Toggle Alpha confirmation", exact: true }).click();
  await expect(page.getByLabel("Slot for Offline Alpha", { exact: true })).toHaveCount(0);
  await page.getByLabel("Slot for Offline Bravo", { exact: true }).selectOption("7");
  await expect(page.getByLabel("Slot for Offline Bravo", { exact: true })).toHaveValue("7");
  const state = JSON.parse(await page.getByTestId("state").textContent());
  expect(state.slotAssignments).toEqual([{ teamId: "b", slotNumber: 7 }]);
  expect(state.teamIds).toEqual(["b", "c"]);
});

test("clipboard uses saved assignments and excludes unsaved changes and private lobby details", async ({ page }) => {
  await page.getByLabel("Slot for Offline Alpha", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "Copy saved slot assignments", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Unsaved form edits are excluded");
  let copied = await page.evaluate(() => window.__copiedSlots.at(-1));
  expect(copied).toContain("Slot 07 — Offline Alpha");
  expect(copied).not.toContain("Slot 03");
  expect(copied).not.toContain("private-fixture");
  await page.getByRole("button", { name: "Acknowledge fixture save", exact: true }).click();
  await expect(page.getByTestId("saved-state")).toHaveText("Fixture save acknowledgement");
  await page.getByRole("button", { name: "Copy saved slot assignments", exact: true }).click();
  copied = await page.evaluate(() => window.__copiedSlots.at(-1));
  expect(copied).toContain("Slot 03 — Offline Alpha");
});

test("clipboard failure is visible and does not report a copy success", async ({ page }) => {
  await page.evaluate(() => { window.__denyClipboard = true; });
  await page.getByRole("button", { name: "Copy saved slot assignments", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Clipboard denied");
  await expect(page.getByRole("status")).toHaveCount(0);
});
