

## Remove Dead Code

Found the following unused files:

### 1. `src/components/NavLink.tsx`
Not imported anywhere in the project.

### 2. `src/App.css`
Not imported anywhere (Vite default boilerplate with `.logo`, `.card`, `.read-the-docs` styles). The app uses `index.css` + Tailwind instead.

### 3. `src/test/example.test.ts`
Placeholder test with `expect(true).toBe(true)` — no real value.

**Total: 3 files to delete.**

