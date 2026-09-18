## Summary

<!-- What does this PR change, and why? One or two sentences. -->

## Type of change

- [ ] `fix` - bug fix (non-breaking)
- [ ] `feat` - new feature (non-breaking)
- [ ] `feat!` / breaking change - fix or feature that changes existing input/output schema behavior
- [ ] `docs` - documentation only
- [ ] `chore` - dependency bump, tooling, CI

## Checklist

- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (see `CONTRIBUTING.md`) - this drives automated changelog/release generation.
- [ ] `npm run lint` passes locally
- [ ] `npm run build` passes locally
- [ ] `npm test` passes locally
- [ ] If this changes the Actor's input or output shape, `.actor/input_schema.json` / `.actor/dataset_schema.json` were updated in this same PR
- [ ] If this changes input/output behavior, the corresponding README sections (Input & Output Schema, Reliability) were updated in this same PR
- [ ] No API tokens, secrets, or real customer data were included anywhere in this PR (code, tests, or fixtures)

## How was this tested?

<!-- Real commands you ran, and what you observed. "It should work" is not a test description. -->

## Related issues

<!-- Closes #123, or "N/A" -->
