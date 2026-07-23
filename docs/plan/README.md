# Delivery Plan

Tasks move through `pending → ready → in-progress → done`. A task becomes ready when every dependency is done. Implementation and verification are separate delivery gates.

## Active sequence

| Order | Task | Objective | Status |
|---:|---|---|---|
| 1 | [commerce-001](tasks/commerce-001.md) | Establish typed Medusa Store SDK connectivity | done |
| 2 | [commerce-002](tasks/commerce-002.md) | Read catalogue data from Medusa | done |
| 3 | [commerce-003](tasks/commerce-003.md) | Replace the custom cart with Medusa cart state | done |
| 4 | [commerce-004](tasks/commerce-004.md) | Move checkout and Paystack into Medusa | done |
| 5 | [commerce-005](tasks/commerce-005.md) | Consolidate customer identity and account reads | ready |
| 6 | [commerce-006](tasks/commerce-006.md) | Move order lifecycle and SMS notifications | pending |
| 7 | [commerce-007](tasks/commerce-007.md) | Remove redundant commerce SQL and routes | pending |

No migration task may redesign storefront pages. Existing routes and visual contracts remain stable unless a later UI-specific task explicitly changes them.
