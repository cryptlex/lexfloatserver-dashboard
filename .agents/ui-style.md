# UI Style

All UI is built from **`@cryptlex/web-components`** (the design system) plus the semantic Tailwind tokens it defines.

- Do not hand-roll a component that already exists there — check the module list below first.
- Do not use raw Tailwind palette colors (`text-gray-500`, `bg-blue-100`, …) — only semantic tokens.
- Do not add custom CSS beyond `src/index.css`.

## Importing components

There is **no barrel/root import** — always use subpaths:

```tsx
import { Button } from '@cryptlex/web-components/components/button';
import { DialogTrigger, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@cryptlex/web-components/components/dialog';
import { DataTable, DataTableProvider, getColumnHelper, useDataTableState } from '@cryptlex/web-components/components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@cryptlex/web-components/components/card';
import { toast } from '@cryptlex/web-components/components/toast';
import { IcActivation, IcProduct } from '@cryptlex/web-components/components/icons';
```

Available `components/*` modules: alert, autocomplete, avatar, badge, breadcrumbs, button, calendar, card, charts, checkbox, code-block, copy-button, data-table, data-table-filter, date-picker, datefield, dialog, disclosure, divider, duration-field, file-trigger, form, icons, id-search, kbd, list-box, loader, menu, multi-select, numberfield, object-table, offline-request-file-input, otpfield, popover, progress-bar, searchfield, select, select-options, sidebar, skeleton, steps, table, table-of-contents, tabs, tag-group, textfield, timeline, toast, tooltip.

Useful `utilities/*`: `resources` (`ApiSchema`, `ApiResponseBody`, `ApiQuery`), `form-hook` (`useAppForm`), `form` (`tfOnSubmit`), `ctx-client` (`useCtxClient`), `theme` (`classNames`), `date`, `validators`.

Components are **react-aria based**: use `onPress` (not `onClick`), `isDisabled` (not `disabled`), `isPending` for loading buttons.

## Colors — design-system tokens only

Only the semantic tokens and the theme's numbered palette scales exist. Dark mode is automatic via `prefers-color-scheme` — never write `dark:` variants or manual dark handling.

Raw scales (`primary-50…950`, `neutral-*`, `destructive-*`, `success-*`, `warning-*`, `discovery-*`) are available, but prefer the semantic token. **Shadows are disabled in the theme (`--shadow-*: initial`) — never use `shadow-*`.**

## Typography, semantics, and hierarchy

Prefer component-provided text slots over hand-rolled headings — they carry the correct semantics and accessible labelling:

- Page/section cards: `CardTitle` + `CardDescription` inside `Card`.
- Dialogs: `DialogTitle` + `DialogDescription`.
- Form sections: `FormSectionTitle` from `components/form`.

When you do write text directly, use the theme's typography utilities (`display`, `heading-1`…`heading-5`, `body-lg`, `body-base`, `body-sm`, `link`) or the established patterns:

```tsx
{/* row/card title */}
<div className="font-semibold text-foreground truncate">{title}</div>
{/* secondary text */}
<span className="text-sm text-muted-foreground">{subtitle}</span>
{/* machine values: keys, IPs, IDs */}
<span className="font-mono">{ip}</span>
```

Keep heading hierarchy strict — one page title, then nested section titles; don't skip levels or use font size alone to imply structure. Use semantic HTML (`<section>`, `<nav>`, lists, `Button` instead of clickable divs).

## Standard compositions

**Table page** — `getColumnHelper<'operationId'>()` for typed columns, `useDataTableState` + `DataTableProvider` + `DataTable`. Canonical example: `src/routes/_app/devices/index.tsx`.

**Details page** — `Card`s with the shared `InfoPanel`, `StatTiles` and `CardAvatar` from `src/components/`. Canonical example: `src/routes/_app/products/$productId.tsx` with `-product.tsx`.

**Dialogs** — trigger-based (`DialogTrigger` > `Button`, `DialogOverlay` > `DialogContent` render-prop `{({ close }) => …}`). Destructive confirmations use `<Button variant="destructive" isPending={…}>`. Examples: `src/routes/_app/products/-activate-dialog.tsx`, `-deactivate-dialog.tsx`.

**Forms** — `useAppForm` from `utilities/form-hook`; fields via `form.AppField` render-prop → `field.TfTextField` / `TfCheckbox` / `TfNumberField` / `TfSingleSelect`; layout `Form > FormLayout > FormSection`.

**Expiry and relative times** — `ExpiryValue` (`src/components/expiry-value.tsx`) for any epoch-seconds timestamp that can be in the future.

**Buttons** — `variant`: `primary | destructive | destructive_neutral | neutral (default) | primary_neutral | ghost | link`; `size`: `default | sm | icon | icon-sm | none`. The prop is `variant`, not `intent`.

**Badges** — `variant`: `success | destructive | warning | neutral | info | discovery`.

**Feedback** — `toast({ variant: 'success' | 'destructive', title, description })` in mutation `onSuccess`/`onError`.

**Icons** — only from `components/icons` (`Ic*` components). Render as JSX (`<IcProduct className="text-muted" />`); pass as references to `icon` props (`icon={IcProduct}`). No lucide or other icon packages.
