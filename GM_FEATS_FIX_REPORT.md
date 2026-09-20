# GM character feat fixes

Based on origin/main `7f1bd25`, implemented in an isolated worktree. Existing working-tree AI generation changes were not modified or included.

## Reproduced causes and fixes

- GM player list opens CharacterDetails by default. It ignored cached legacy feat rows that the editor displayed. Both views now resolve the same document, and legacy use/recharge actions persist that resolved document.
- Editor fallback treated an empty embedded array as missing and resurrected stale legacy feats. An existing array, including `[]`, is now authoritative. Legacy fallback applies only when no array exists.
- Editor subfeat projection discarded exhaustion state. It now retains that state and offers the correct recharge action.
- Details ignored specialities saved in `note`. It now displays these, preserving explicit `speciality` precedence.
- Transforming subfeats did not transform in details and could not be used in the editor. Both actions now swap the subfeat and reset exhaustion state.

The shared legacy resolver preserves state and excludes deleted rows through existing local-store selectors. Viewing performs no writes. No database policies, production data, dependencies, or secrets were changed. Astra reviewed both the primary fix and subsequent transformation changes with no blocking findings.

## Verification

- `npx vitest run src/components/CharacterFeats.test.tsx`: initial seven regressions all failed against unchanged `7f1bd25`. Two transformation tests subsequently failed before their fix. Final nine regressions pass.
- `npm test`: 53 tests passed across four files.
- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npx tsc -p tsconfig.node.json --noEmit`: passed.
- `npx eslint src/hooks/useCharacterFeats.ts src/components/CharacterFeats.test.tsx`: passed.
- `npm run lint`: 296 errors and 25 warnings. Baseline: 302 errors and 25 warnings. Comparison found no new lint findings; six existing findings were removed.
- `npm run build`: unavailable through its normal prebuild because `bunx` is not installed.
- Equivalent build steps, `npx --yes tsx scripts/generate-sitemap.ts && npm exec vite build`: passed, including PWA generation. Existing large-chunk warning remains.
- `git diff --check`: passed.

## Limits

Component tests use real local-store hooks and GM dialog interaction, with the feat display component and external services mocked. They verify state and action wiring, not browser layout or live production synchronization. Production migration/data state and Lovable publishing were not verified. Test rendering emits existing dialog accessibility warnings. Installation audit reports 21 dependency vulnerabilities (1 low, 6 moderate, 14 high); dependency remediation is outside this fix. No claim that the whole application is bug-free is warranted.

Lovable project: https://lovable.dev/projects/81d72331-f39f-42a0-8104-483bc69c26ee

Public site: https://flagellum-dei.lovable.app
