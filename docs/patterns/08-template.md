# 08 — This project's template

Built from the designer template **sports-car-brand**. Sections are React components under `src/components/sections/<category>/`; the page (`src/pages/HomePage.tsx`) composes them and holds ALL content in their props. Navbar + footer live in `src/components/Layout.tsx`.

- Content edits → change the props in the page/Layout, never fork the component.
- Structural edits → edit the component file in place (keep its props interface).
- Backgrounds are GLOBAL: new sections are transparent or `bg-background`/`bg-muted`.
- New page → add it to the navbar's `navItems` in Layout and switch in-page anchors to `/#anchor`.
