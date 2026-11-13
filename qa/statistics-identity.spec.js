import { expect, test } from "@playwright/test";
import { build } from "esbuild";

// Actual statistics rendering with explicit data/realtime/Next fixtures only.
// No staging query, identity repair or official scoring change is performed.
let script;
test.beforeAll(async () => {
  const result = await build({
    bundle: true, write: false, platform: "browser", jsx: "automatic",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
    stdin: { sourcefile: "statistics-identity-fixture.tsx", loader: "tsx", resolveDir: process.cwd(), contents: `
      import {createRoot} from 'react-dom/client';import {useState} from 'react';
      import StatisticsPageClient from './components/statistics/StatisticsPageClient';
      const rows=[
        {teamId:'',team:'Historical Alpha',rank:1,matches:3,kills:10,placement:20,points:30},
        {teamId:'',team:'Historical Bravo',rank:2,matches:2,kills:5,placement:12,points:17},
        {teamId:'linked-team',team:'Verified Team',rank:3,matches:1,kills:4,placement:6,points:10},
        {teamId:'  ',team:'Historical Alpha',rank:4,matches:1,kills:3,placement:6,points:9}
      ];
      function Harness(){const [data,setData]=useState(rows);window.__refreshStatistics=()=>setData([...rows].reverse().map(row=>({...row,points:row.points+1})));return <StatisticsPageClient initialOverview={null} initialLeaderboard={data} initialPlayers={[]}/>;}
      createRoot(document.getElementById('root')).render(<Harness/>);
    ` },
    plugins: [{ name: "statistics-data-boundary", setup(builder) {
      builder.onResolve({ filter: /^(next\/link|next\/image|@\/lib\/realtime-hooks)$/ }, args => ({ path: args.path, namespace: "statistics-fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "statistics-fixture" }, args => ({ loader: "jsx", resolveDir: process.cwd(), contents: {
        "next/link": "export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",
        "next/image": "export default function Image({fill,priority,unoptimized,...props}){return <img {...props}/>}",
        "@/lib/realtime-hooks": "export function useBravoRealtimeData(){return {overview:null,leaderboardRows:[],players:[]}}",
      }[args.path] }));
    } }],
  });
  script = result.outputFiles[0].text;
});

test("unlinked historical teams retain scores without duplicate keys or empty profile links", async ({ page }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://statistics-fixture.test") return route.abort("blockedbyclient");
    return url.pathname === "/fixture.js"
      ? route.fulfill({ contentType: "text/javascript", body: script })
      : route.fulfill({ contentType: "text/html", body: '<!doctype html><html><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
  });
  await page.goto("http://statistics-fixture.test/");
  const table = page.getByRole("table", { name: /^Team Standings:/ });
  const rows = table.locator("tbody tr");
  await expect.poll(async () => ({ rows: await rows.count(), errors })).toEqual({ rows: 4, errors: [] });
  await expect(rows.nth(0)).toContainText("Historical Alpha");
  await expect(rows.nth(0).locator("td").last()).toHaveText("30");
  await expect(rows.nth(1).locator("td").last()).toHaveText("17");
  await expect(table.getByRole("link")).toHaveCount(1);
  await expect(table.getByRole("link", { name: /Verified Team/ })).toHaveAttribute("href", "/teams/linked-team");
  await expect(table.locator('a[href="/teams/"]')).toHaveCount(0);
  await expect(rows.nth(0).getByRole("link")).toHaveCount(0);
  await expect(rows.nth(1).getByRole("link")).toHaveCount(0);
  await expect(rows.nth(3).getByRole("link")).toHaveCount(0);
  await page.evaluate(() => window.__refreshStatistics());
  await expect(rows.nth(0).locator("td").last()).toHaveText("10");
  await expect(rows.nth(3).locator("td").last()).toHaveText("31");
  await expect(rows).toHaveCount(4);
  await expect(table.getByRole("link")).toHaveCount(1);
  expect(errors).toEqual([]);
});
