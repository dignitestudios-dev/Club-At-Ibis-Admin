# Club At Ibis — Super Admin Console (UI prototype)

Front-end-only prototype of the Super Admin interface for the Club At Ibis
Architectural Review Board. It shares the theme, typography and component kit
of the resident portal (`Club-At-Ibis-User`). All data is mock data kept in the
browser's `localStorage`; there is no backend.

## Run

```bash
npm install
npm run dev
```

Sign in with the pre-filled credentials (`morgan.ellis@clubatibis.com` / `admin123`).
To restore the original sample data, clear this site's local storage in the browser.

## What's in it

| Area | Route | Notes |
| --- | --- | --- |
| Dashboard | `/dashboard` | Status totals, "needs attention" queue, pipeline donut, 6-month trend, reviewer workload |
| Requests | `/requests`, `/requests/[id]` | Search, filters (Apply / Clear), CSV export of all matching rows, oversight-only detail with locked decision actions |
| Assignments | `/assignments` | Intake queue and in-progress requests; assign or reassign any request to any active reviewer |
| Reviewers | `/reviewers`, `/reviewers/[id]` | Create (emailed invitation link — no admin-set password), resend invitation, change password (active reviewers), "Receive New Requests" toggle (last default reviewer needs a replacement), login enable/disable |
| Residents | `/residents`, `/residents/[id]` | Search, related requests and history |
| Password reset | `/password-reset` | Send reset link to a resident or reviewer; initiation recorded in activity |
| Categories & forms | `/categories`, `/categories/new`, `/categories/[id]/edit` | Form builder (short text / long text / document upload, required, help text, drag-to-order) with live preview; archive / restore, full version history with restore (`/categories/[id]/versions`) |
| Activity log | `/activity` | Audit trail of admin actions |
| Notifications | `/notifications` | Oversight alerts |

Extras: `Ctrl/⌘ K` command palette, animated dashboard charts, URL-persisted filters, unsaved-changes guard in the form builder, light/dark theme, responsive layout.

## Structure

- `src/features/*` — feature folders (`api/` mock services, `components/`)
- `src/hooks/use-admin-data.ts` — React Query hooks for every resource
- `src/lib/mock/*` — seed data and the `localStorage` store
- `src/lib/domain.ts` — status metadata, request filtering, CSV builder
- `src/types/domain.d.ts` — shared domain types
