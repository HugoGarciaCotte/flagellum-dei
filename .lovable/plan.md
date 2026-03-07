

## Rename AI Buttons for Clarity

Rename all AI-related button labels and dialog titles in `src/components/ManageFeats.tsx` to clearly describe what they do:

| Current Label | New Label |
|---|---|
| "Check with AI" (line 371) | "Check Parseable Fields with AI" |
| "Regenerate All AI" (line 381) | "Generate All Parseable Fields" |
| "Regenerate AI" (per-feat, line 504) | "Generate Parseable Fields" |
| "AI Review Results" (dialog title, line 612) | "Parseable Fields Review" |
| "Regenerate Selected" (dialog footer, line 670) | "Generate Selected" |
| Toast "Bulk regeneration complete" (line 174) | "Bulk generation complete" |
| Toast "AI check failed" (line 194) | "Parseable fields check failed" |

All changes in a single file: `src/components/ManageFeats.tsx`.

