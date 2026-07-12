# Repository Recovery QA Record

**Incident date:** 2026-07-13  
**Recovery branch:** `rescue/rebuild-agentic-ui`  
**Recovery checkpoint:** `261544825b39353e4ff320b5ce026a5e491b97a8`

## Purpose

This record documents a repository recovery as part of the project's quality-assurance evidence. It covers the failure mode, forensic inspection, reconstruction sources, validation results, and controls adopted to prevent recurrence.

## Incident summary

The agentic feature branch was accidentally repointed to a different branch history with `git checkout -B`. Subsequent destructive cleanup removed several untracked implementation files. A later checkpoint therefore contained integration callers and UI references, but not the underlying response-composer and simulated-handoff modules.

No production deployment or remote merge was performed from the broken checkpoint.

## Protected references

Before reconstruction, read-only rescue branches were created for every known commit:

- `rescue/broken-c642`
- `rescue/agentic-base`
- `rescue/hybrid-base`
- `rescue/ui-base`
- `rescue/dangling-ca423c`
- `rescue/dangling-9c3411`

The pre-existing stash was deliberately left untouched.

## Recovery map

| Component | Recovery source |
|---|---|
| Agentic architecture and support policy | Trusted agentic base `39b9301` |
| Hybrid retrieval | Checkpoint `fa909cb72c0f18eeb558a50c16fa9d1977901726` and its descendants |
| UI polish and surviving integration callers | Broken/WIP tree `c642671e32f129e2f64c10b8ad826bd062a41ebc` |
| Multilingual normalization | Surviving UI/integration tree |
| Response composer | Reconstructed from surviving contracts and documented behavior |
| Simulated handoff service/API/tests | Reconstructed from surviving contracts and documented behavior |

## Files that were not recoverable from Git objects

- `src/lib/support-handoff.ts`
- `src/lib/response-composer.ts`
- `src/lib/response-composer.test.ts`
- `src/app/api/support/handoff/route.ts`
- `src/app/api/support/handoff/handoff.test.ts`

These files had existed only as untracked files before destructive cleanup. They were reconstructed using surviving imports, types, UI contracts, tests, and the previously reviewed API specification.

## Reconstructed controls

- Structured `HandoffResult` contract instead of parsing state from customer-facing text.
- Protected `/api/support/handoff` adapter with authentication, rate limiting, and payload validation.
- Shared simulated-handoff service used directly by the support agent.
- Bounded in-memory `Map` for idempotency with FIFO eviction at 5,000 entries.
- Explicit `simulated: true` and `QUEUED` status.
- Locale-specific customer responses for English, Thai, and Chinese.
- Redacted trace input that omits full customer messages and raw idempotency keys.
- Separate customer reply, structured handoff result, and technical execution trace.

## Recovered capabilities

- Password-gated demo access
- Bounded agentic support workflow
- Hybrid retrieval and query-topic classification
- Intent and risk classification
- Groundedness verification
- `AUTO_RESPOND` and `ESCALATE` decisions
- Multilingual normalization
- Natural response composition
- Simulated external-style support handoff
- Structured `result.handoff` UI rendering
- Redacted execution traces
- Knowledge Base and portfolio UI polish

## Validation evidence

The exact recovered tree passed:

| Check | Result |
|---|---|
| ESLint | Passed |
| TypeScript typecheck | Passed |
| Unit/integration tests | **160/160 passed** across 21 test files |
| Next.js production build | Passed |
| Handoff route generation | `/api/support/handoff` present |
| Secret/config review | No `.env`, `.env.local`, credentials, or API keys included |
| Artifact review | No build output, dependency folders, temporary diagnostics, or assistant workspace artifacts included |

An earlier claim of 175 tests could not be reproduced because some uncommitted tests were deleted before the broken checkpoint. This QA record reports only reproducible results from the recovered commit.

## Root-cause controls adopted

1. Do not run `git clean -fd` while wanted files are untracked.
2. Do not use `git checkout -B` to reuse an existing feature-branch name during recovery.
3. Create a checkpoint commit before switching branches.
4. Prefer explicit checkpoint commits over repeated stash/pop cycles.
5. Create rescue refs before inspecting or integrating dangling objects.
6. Verify committed contents with `git show --name-status` and `git ls-tree`.
7. Run quality gates against the exact committed tree.
8. Do not push, merge, or deploy a recovered branch before independent review.

## Current status

The recovered implementation is preserved in commit:

`261544825b39353e4ff320b5ce026a5e491b97a8`

The branch is retained separately for review and has not been merged into the default branch by this recovery procedure.
