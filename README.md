# Akshay Gajbhiya: portfolio, Algo Lab and CSS & Motion Lab

This repo has my portfolio site and two projects that live inside it: an Algo Lab that animates data structures and algorithms step by step, and a CSS & Motion Lab with small effects built from plain HTML, CSS and JavaScript.

**Live site:** https://kingaki007.github.io/portfolio/

| URL            | What it is                                                                              |
| -------------- | --------------------------------------------------------------------------------------- |
| `/`            | The portfolio: intro, selected work, skills, resume download, contact                   |
| `/algo/`       | **Algo Lab**: 40 data structures and algorithms animated step by step, with synced code |
| `/animations/` | **CSS & Motion Lab**: 15 plain HTML/CSS/JS effects with copyable code                   |

## Algo Lab

Every topic has the same layout: the visualisation, the full TypeScript implementation with the active lines highlighted, a short note explaining each step, a player (play, pause, step, scrub, 0.5x to 4x speed), and a **Copy code** button that copies the whole implementation.

Each topic runs on built-in test cases (including long ones and edge cases) or on whatever input you type in. The exact input being animated is always shown, and the operation that is running right now is highlighted.

| Group               | Topics                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Stack               | array (`top` index) and linked list, with no built-in array methods                                        |
| Queue               | circular array (`front` / `back`) and linked list, with no built-in array methods                          |
| Linked List         | insert head/tail/at, remove, find, reverse                                                                 |
| Heap                | min heap, max heap                                                                                         |
| Hashing             | hash set with chaining, simulated memory addresses, load factor and resize                                 |
| Trees               | BST, AVL, 2-3-4, red-black, Trie, Fenwick tree                                                             |
| Sorting             | bubble, selection, insertion, merge, quick, heap                                                           |
| Graphs              | representations (list, matrix, hash map), BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, union-find      |
| Backtracking        | N-Queens, permutations, subsets, subset sum (with pruning), Sudoku                                         |
| Dynamic programming | 1D: climbing stairs, house robber, coin change. 2D: LCS, edit distance, knapsack. 3D: LCS of three strings |

A few things I left out on purpose, and each topic's description says so too: the 2-3-4 and red-black trees do insert and search but not delete, N-Queens stops at the first solution, Sudoku stops after 12,000 steps, and the Fenwick tree and union-find use fixed sizes (12 positions and 8 elements).

## CSS & Motion Lab

Scroll-driven animation, `@property` gradients, 3D tilt, glassmorphism, container queries, `:has()`, View Transitions, a canvas particle network and more. No libraries for the effects themselves.

Each demo has HTML, CSS and JS tabs. The page injects and runs exactly that code, so what you read is what runs. **Copy full file** gives a standalone `.html` page that works when pasted into an empty file.

I format the code with Prettier and highlight it with [Prism](https://prismjs.com) (MIT). A small Prism bundle is vendored in `apps/portfolio/public/animations/vendor/`, so the page doesn't depend on a CDN. The first demo, **Scroll progress bar**, is the bar fixed to the top of the page, with its HTML, CSS and a JS fallback for Firefox in the code tabs.

The old `/fx/` address redirects to `/animations/`.

## Project layout

```
apps/
  portfolio/            Next.js 14 (static export) → site root
    content.ts          all personal details, projects, skills: edit this file
    app/                page, layout, styles
    public/
      animations/       CSS & Motion Lab (one self-contained HTML file)
      fx/               redirect to /animations/
      Akshay_Gajbhiya_Resume.pdf
  algo/                 Vite + React + TypeScript → /algo/
    src/engine/         parser, player hook, line lookup, clipboard helper
    src/components/     visualisers (tree, graph, DP table, bars, board…)
    src/topics/         one module per topic: code string, step generator, presets
    src/registry.tsx    the list of topics and how each one is rendered
    tests/              all the tests (Vitest), kept apart from the source
    vitest.config.ts    points Vitest at tests/
packages/ui/            shared design tokens (CSS variables)
scripts/merge.mjs       combines both builds into ./site
scripts/serve.mjs       local preview server for ./site (npm run preview)
.github/workflows/      CI and GitHub Pages deploy
```

## Running it locally

I use Node 22 or newer. Install once from the repository root:

```bash
npm install
```

There are two ways to run it, depending on what I'm doing.

### Option A: development servers (hot reload while I edit)

Each command goes in its own terminal. Leave them running.

```bash
npm run dev:portfolio   # portfolio + CSS & Motion Lab
npm run dev:algo        # Algo Lab
```

| What | URL |
| --- | --- |
| Portfolio landing page | http://localhost:3000/ |
| CSS & Motion Lab | http://localhost:3000/animations/ (served by a dev-only rewrite; `/animations` redirects here) |
| Old CSS & Motion Lab address | http://localhost:3000/fx/index.html (redirects) |
| Algo Lab index | http://localhost:5173/algo/ |
| An Algo Lab topic | http://localhost:5173/algo/avl, `/algo/dijkstra`, `/algo/stack-array` … |

In this mode the two apps run on different ports, so the "Explore Algo Lab" button on the portfolio points at `localhost:3000/algo/`, which doesn't exist. I open the Algo Lab on port 5173 directly, or use Option B. Next prints a warning about "rewrites" and "output: export" on startup. It only concerns the development rewrite and can be ignored.

Stop a server with `Ctrl+C`.

### Option B: the full site exactly as deployed

This builds both apps, merges them into `./site`, and serves them together on one port with the same deep-link behaviour as GitHub Pages.

```bash
npm run build           # builds both apps and merges them into ./site
npm run preview         # serves ./site at http://localhost:4173/
```

| What | URL |
| --- | --- |
| Portfolio landing page | http://localhost:4173/ |
| Algo Lab | http://localhost:4173/algo/ |
| An Algo Lab topic (deep link) | http://localhost:4173/algo/avl |
| CSS & Motion Lab | http://localhost:4173/animations/ |
| Resume download | http://localhost:4173/Akshay_Gajbhiya_Resume.pdf |

`PORT=8080 npm run preview` (macOS/Linux) or `$env:PORT=8080; npm run preview` (PowerShell) uses another port. Preview serves whatever is in `./site`, so rebuild after code changes.

Don't run a production build while `npm run dev:portfolio` is running. They share Next's `.next` folder, and the dev server starts returning errors until I restart it.

To test the exact GitHub Pages sub-path locally, build with the base path set (the deployed site lives under `/portfolio/`):

```bash
BASE_PATH=/portfolio npm run build       # macOS / Linux
$env:BASE_PATH = "/portfolio"; npm run build; Remove-Item Env:BASE_PATH   # PowerShell
```

Then serve it from a folder that has a `portfolio` directory inside it, so `/portfolio/...` URLs resolve. Git Bash on Windows rewrites a leading `/` in values such as `/portfolio`, so I use PowerShell for this one.

## Testing

### 1. Automated tests

```bash
npm test
```

The tests live in `apps/algo/tests/`, not next to the source, and `apps/algo/vitest.config.ts` tells Vitest to run only `tests/**/*.test.ts`. They import from `../src/...`. A few other ways to run them:

```bash
npm run test:watch -w apps/algo                       # re-run on every save
npm test -w apps/algo -- tests/dp.test.ts             # one file

cd apps/algo
npx vitest run -t "red-black"                         # only tests whose name matches
```

(The name filter has to be run from `apps/algo`. Passed through `npm test` from the repo root, npm swallows the `-t` flag and runs everything.)

About 490 tests, a few seconds. They do more than check that the animations run:

- every algorithm's displayed code is compiled and executed, then compared with the animation's result (for example Dijkstra against Bellman-Ford on random graphs, Kruskal against Prim, a red-black tree against its real implementation);
- invariants are checked at every frame (sorting frames are always valid permutations, AVL and red-black trees stay balanced, 2-3-4 leaves stay at one depth);
- the stack and queue code is checked for built-in array methods, since the point of those two was not to use any;
- every preset has to parse, run, and only highlight lines that exist.

CI runs the same command before every deploy, so a failing test blocks the release.

### 2. Does it build?

```bash
npm run build
```

This runs the TypeScript compiler on the Algo Lab and a full Next.js production build. A type error, or a crash while rendering the portfolio, fails the build. If `apps/portfolio/content.ts` is missing a field the page uses, this is where I find out.

### 3. Manual checklist (about five minutes)

Start Option B (`npm run build`, then `npm run preview`) and open http://localhost:4173/.

**Portfolio**
1. The page loads with my name, role and designation. Narrow the window to about 320 to 400 px: the name has to stay on one line and the page must not scroll sideways.
2. Click **Download resume**: a PDF downloads. Check the email link.
3. Click the **PDFPark** card: it opens https://pdfpark.in in a new tab.

**Algo Lab** (click *Explore Algo Lab*, or go to `/algo/`)
1. Type `heap` in **Find a topic**: only the heap topics remain. Clear it.
2. Open **Stack (array)** and press **Play**: the code lines light up in step with the animation, and the note under the player explains each step.
3. Try the speed buttons (0.5x to 4x) and drag the step slider.
4. Pick another entry under **Default test cases**: the exact input shows in the "Input being animated" chips and the current operation is highlighted.
5. Switch to **My own input**, type `push 1, push 2, pop` and press **Run my input**. Then try something invalid like `push` or `bogus 3`: a clear error appears and the animation doesn't change.
6. Press **Copy code** and paste it into an editor: it should be the complete class, not just the highlighted lines.
7. Open a deep link straight from the address bar: http://localhost:4173/algo/avl loads the AVL page.
8. Spot-check one topic from each group: **Dijkstra** (distances and highlighted edges), **Hash Set** (resize and addresses), **Merge Sort** (bars move), **N-Queens** (board), **LCS** (table fills and traces back).

**CSS & Motion Lab** (`/animations/`)
1. Hover the tilt card and the spotlight tiles, and move the cursor near the magnetic button.
2. Hover the underlined link in *Micro-interactions*: the underline sweeps in.
3. Drag the dashed corner of the *Container queries* card: the layout changes as it gets wider.
4. Click the **theme** button: the new theme grows from where I clicked.
5. Scroll the page: the bar at the very top fills. Open **Show code** on the first demo (*Scroll progress bar*) to see its code.
6. Open **Show code** on any demo: the code is indented and syntax-coloured. Switch between HTML, CSS and JS, press **Copy full file**, paste it into an empty `.html` file and open it: the demo works on its own.
7. http://localhost:4173/fx/ redirects to `/animations/`.

If something fails, the browser console (`F12`) is the first place to look.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: install, test, build, then publish `./site` to GitHub Pages. If a test or the build fails, nothing is published and the live site keeps the last good version.

The site is served from a sub-path (`/portfolio/`), so the workflow sets `BASE_PATH=/<repository name>`. Both apps read it: Next uses it as `basePath` and Vite as the base of `/algo/`. A repository named `<owner>.github.io` is served from the root instead, so for those the workflow sets `BASE_PATH` to empty. A local build without it also serves from `/`.

GitHub Pages only serves one `404.html`, so `scripts/merge.mjs` writes a small redirect into it. A direct link such as `/algo/avl` is saved and handed to the Algo Lab app, which restores it. The server still answers those deep links with status 404 before redirecting, which is normal for static hosting.

To move to a custom domain: point it at GitHub Pages, set it in the repository's Pages settings and remove the `BASE_PATH` line from the workflow.

## Updating the content

1. Edit `apps/portfolio/content.ts` (name, role, metrics, projects, skills, contact).
2. Replace `apps/portfolio/public/Akshay_Gajbhiya_Resume.pdf`, keeping the file name or updating `resume` in `content.ts`.
3. Run `npm run build` to make sure nothing is missing, then push to `main`.

## Adding an algorithm to the Algo Lab

1. Create `apps/algo/src/topics/<name>.ts` exporting:
   - a `Topic` (id, title, group, blurb, input syntax, code string, complexity);
   - a parser, for example with `parseOps` from `engine/parse.ts`;
   - a step generator returning `Step[]`: `{ state, lines, note, op }`;
   - presets (a few normal ones, one edge case, one long one).
2. Find code line numbers with `lineOf(code, "text on that line")` so the highlights survive edits to the code.
3. Add a visualiser component if none of the existing ones fits.
4. Register the topic in `src/registry.tsx`, and add its group to `GROUP_ORDER` in `src/Lab.tsx` if it's a new one.
5. Add a test in `apps/algo/tests/` that runs the code string and compares it with the animation.

## Tech

| Area | What I used |
| --- | --- |
| Portfolio | Next.js 14.2 (App Router, static export), React 18.3, TypeScript 5.6 |
| Algo Lab | Vite 5.4, React 18.3, React Router 6.28, TypeScript 5.6 (strict) |
| CSS & Motion Lab | plain HTML, CSS and JavaScript, no animation libraries or build step; Prism 1.29 (vendored) highlights the code panels |
| Styling | hand-written CSS: custom properties, `@property`, container queries, `:has()`, scroll-driven animation, View Transitions |
| Repository | npm workspaces (`apps/*`, `packages/*`), shared design tokens in `packages/ui` |
| CI and hosting | GitHub Actions, GitHub Pages |

### Testing stack

| Tool | Used for |
| --- | --- |
| **Vitest** 2.1 | the test runner (`npm test`): about 490 unit and property-style tests, run in Node |
| **esbuild** (installed with Vite) | inside the tests: compiles the TypeScript shown on screen so the tests can run the exact code people copy |
| **TypeScript compiler** (`tsc --noEmit`) | type checking, run as part of `npm run build` |
| **Next.js build** | catches rendering and data errors in the portfolio at build time |
| Manual checklist | the browser-level checks above. There is no automated browser (end-to-end) framework such as Playwright or Cypress in this repo |
