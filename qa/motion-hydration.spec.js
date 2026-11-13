import { test, expect } from "@playwright/test";
import { build } from "esbuild";

let script;
test.beforeAll(async () => {
  const bundle = await build({
    bundle: true, write: false, platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    stdin: { sourcefile: "motion-hydration-fixture.tsx", resolveDir: process.cwd(), loader: "tsx", contents: `
      import React from 'react';
      import {createRoot,hydrateRoot} from 'react-dom/client';
      import {MotionObserver} from './components/ui/MotionSystem';
      window.__observed=[]; window.__animations=[];
      window.IntersectionObserver=class {constructor(callback){this.callback=callback}observe(target){window.__observed.push(target);this.callback([{target,isIntersecting:true}])}unobserve(){}disconnect(){}};
      const nativeAnimate=Element.prototype.animate;
      Element.prototype.animate=window.__noAnimationApi?undefined:function(frames,options){window.__animations.push({frames,options});return nativeAnimate.call(this,frames,options)};
      function Target(){return <main><section className="hero-banner">Delayed component content</section></main>}
      window.__hydrate=()=>hydrateRoot(document.getElementById('delayed'),<Target/>);
      createRoot(document.getElementById('observer')).render(<MotionObserver/>);
    ` },
    plugins: [{ name: "motion-pathname-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "motion-fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "motion-fixture" }, () => ({ contents: "export function usePathname(){return window.__path||'/login'}", loader: "js" }));
    } }],
  });
  script = bundle.outputFiles[0].text;
});

async function fixture(page, { reduced = false, unsupported = false, protectedRoute = false } = {}) {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script });
    return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><style>:root{--motion-section:420ms;--ease-out:cubic-bezier(0.22,1,0.36,1)}</style></head><body><div id="observer"></div><div id="delayed"><main><section class="hero-banner">Delayed component content</section></main></div><script>window.__path=${JSON.stringify(protectedRoute ? "/admin" : "/login")};window.__noAnimationApi=${JSON.stringify(unsupported)}</script><script src="/fixture.js"></script></body></html>` });
  });
  await page.goto("http://qa-motion.test/");
  await page.waitForFunction(() => typeof window.__hydrate === "function");
  return errors;
}

test("motion reveals streamed content without changing markup before delayed hydration", async ({ page }) => {
  const errors = await fixture(page);
  await page.waitForFunction(() => window.__animations.length === 1);
  const target = page.locator(".hero-banner");
  await expect(target).not.toHaveAttribute("data-motion");
  await expect(target).not.toHaveAttribute("data-revealed");
  expect(await target.getAttribute("style")).toBeNull();
  expect(await page.evaluate(() => window.__animations[0].options.duration)).toBe(420);
  expect(await page.evaluate(() => window.__animations[0].frames[0].transform)).toBe("translateY(14px)");
  await page.evaluate(() => window.__hydrate());
  await expect(target).toHaveText("Delayed component content");
  await page.waitForTimeout(50);
  expect(errors).toEqual([]);
});

for (const mode of [{ reduced: true }, { unsupported: true }, { protectedRoute: true }]) test(`motion remains optional and visible for ${Object.keys(mode)[0]}`, async ({ page }) => {
  const errors = await fixture(page, mode);
  await page.evaluate(() => window.__hydrate());
  await expect(page.locator(".hero-banner")).toBeVisible();
  await expect(page.locator(".hero-banner")).not.toHaveAttribute("data-motion");
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__animations)).toHaveLength(0);
  expect(errors).toEqual([]);
});
