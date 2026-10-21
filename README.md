# Akshay Gajbhiya: portfolio, Algo Lab and CSS & Motion Lab

A front-end portfolio with two interactive projects built into it.

**Live site:** https://kingaki007.github.io/portfolio/

| URL | What it is |
| --- | --- |
| `/` | The portfolio: intro, selected work, skills, resume download, contact |
| `/algo/` | **Algo Lab**: 40 data structures and algorithms animated step by step, with synced code |
| `/animations/` | **CSS & Motion Lab**: 14 plain HTML/CSS/JS effects with copyable code |

## Algo Lab

Every topic has the same layout: the visualisation, the full TypeScript implementation with the active lines highlighted, a plain-English note for each step, a player (play, pause, step, scrub, 0.5x to 4x speed), and a **Copy code** button that copies the complete implementation.

Each topic can run on **built-in test cases** (including long ones and edge cases) or on **your own input**. The exact input being animated is always shown, and the operation currently running is highlighted.

| Group | Topics |
| --- | --- |
| Stack | array (`top` index) and linked list, with no built-in array methods |
| Queue | circular array (`front` / `back`) and linked list, with no built-in array methods |
| Linked List | insert head/tail/at, remove, find, reverse |
| Heap | min heap, max heap |
| Hashing | hash set with chaining, simulated memory addresses, load factor and resize |
| Trees | BST, AVL, 2-3-4, red-black, Trie, Fenwick tree |
| Sorting | bubble, selection, insertion, merge, quick, heap |
| Graphs | representations (list, matrix, hash map), BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, union-find |
| Backtracking | N-Queens, permutations, subsets, subset sum (with pruning), Sudoku |
| Dynamic programming | 1D: climbing stairs, house robber, coin change. 2D: LCS, edit distance, knapsack. 3D: LCS of three strings |

Known limits, stated in each topic's description: 2-3-4 and red-black trees show insert and search only; N-Queens stops at the first solution; Sudoku stops after 12,000 steps; Fenwick uses 12 positions and union-find 8 elements.

## CSS & Motion Lab

Scroll-driven animation, `@property` gradients, 3D tilt, glassmorphism, container queries, `:has()`, View Transitions, a canvas particle network and more. No libraries.

Each demo has **HTML, CSS and JS tabs**. The page injects and runs exactly that code, so what you read is what runs. **Copy full file** produces a standalone `.html` page that works pasted into an empty file.

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
packages/ui/            shared design tokens (CSS variables)
scripts/merge.mjs       combines both builds into ./site
.github/workflows/      CI and GitHub Pages deploy
```

## Getting started

Requires Node 22 or newer.

```bash
npm install
npm run dev:portfolio   # http://localhost:3000/  (and /animations/)
npm run dev:algo        # http://localhost:5173/algo/
```

The two apps run on separate ports in development, so the "Explore Algo Lab" link on the portfolio only resolves in a full build. To see everything together exactly as deployed:

```bash
npm run build           # builds both apps and merges them into ./site
```

then serve `./site` with any static file server.

## Tests

```bash
npm test
```

The tests do more than check that the animations run:

- every algorithm's **displayed code is compiled and executed**, then compared with the animation's result (for example Dijkstra against Bellman-Ford on random graphs, Kruskal against Prim, a red-black tree against its real implementation);
- invariants are checked at every frame (sorting frames are always valid permutations, AVL and red-black trees stay balanced, 2-3-4 leaves stay at one depth);
- the stack and queue code is checked for the absence of built-in array methods;
- every preset must parse, run, and only highlight lines that exist.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: install, test, build, then publish `./site` to GitHub Pages.

The site is served from a sub-path (`/portfolio/`), so the build sets `BASE_PATH=/<repository name>`. Both apps read it: Next uses it as `basePath` and Vite as the base of `/algo/`. A local build without it serves from `/`.

GitHub Pages only serves one `404.html`, so `scripts/merge.mjs` writes a small redirect into it. A direct link such as `/algo/avl` is saved and handed to the Algo Lab app, which restores it. The server still answers those deep links with status 404 before redirecting, which is normal for static hosting.

To use a custom domain, point it at GitHub Pages, set it in the repository's Pages settings and remove the `BASE_PATH` line from the workflow.

## Making it yours

1. Edit `apps/portfolio/content.ts` (name, role, summary, metrics, projects, skills, contact).
2. Replace `apps/portfolio/public/Akshay_Gajbhiya_Resume.pdf`, keeping the same file name or updating `resume` in `content.ts`.
3. Push to `main`.

## Adding an algorithm to the Algo Lab

1. Create `apps/algo/src/topics/<name>.ts` exporting:
   - a `Topic` (id, title, group, blurb, input syntax, code string, complexity);
   - a parser, for example with `parseOps` from `engine/parse.ts`;
   - a step generator returning `Step[]`: `{ state, lines, note, op }`;
   - presets (a few normal, one edge case, one long).
2. Find code line numbers with `lineOf(code, "text on that line")` so the highlights survive edits to the code.
3. Add a visualiser component if none of the existing ones fits.
4. Register the topic in `src/registry.tsx` and add its group to `GROUP_ORDER` in `src/Lab.tsx` if it is new.
5. Add a test that runs the code string and compares it with the animation.

## Tech

React 18, TypeScript, Vite, Next.js 14, Vitest, hand-written CSS (custom properties, `@property`, container queries, View Transitions), npm workspaces, GitHub Actions and GitHub Pages.
