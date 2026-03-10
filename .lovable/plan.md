

## Stack Dice Roll Toasts

The toast system currently has `TOAST_LIMIT = 1`, meaning only one toast shows at a time. When multiple players roll simultaneously, the GM only sees the last one.

### Changes

**`src/hooks/use-toast.ts`**
- Increase `TOAST_LIMIT` from `1` to `10` (or similar) so multiple toasts can stack.
- Reduce `TOAST_REMOVE_DELAY` to something reasonable like `5000` (5 seconds) so old toasts auto-dismiss.

**`src/components/ui/toast.tsx`** (ToastViewport)
- Ensure the viewport can display multiple stacked toasts (it already uses `flex-col`, so this should work out of the box once the limit is raised).

