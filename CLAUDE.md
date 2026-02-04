# Project Guidelines

## Live Site
https://andymontgomery-byte.github.io/map-quadrants/

## Verification Requirement
**BEFORE telling the user a change is ready:**
1. Run `npm run test:smoke` - must pass
2. Review screenshots in `test-screenshots/` if visual changes
3. Deploy with `npm run deploy`
4. Verify the live site works

Never skip smoke tests. They validate the full user flow.

## Key Principles
- **Plan Mode Default**: Enter plan mode for 3+ step tasks or architectural decisions
- **Subagents**: Use liberally for research, exploration, parallel analysis
- **Self-Improvement**: Update `tasks/lessons.md` after ANY user correction
- **Verify Before Done**: Prove it works - tests, logs, "would a staff engineer approve?"
- **Demand Elegance**: For non-trivial changes, ask "is there a more elegant way?"
- **Autonomous Bug Fixing**: Just fix it, don't ask for hand-holding

## Task Management
1. Write plan to `tasks/todo.md` with checkable items
2. Check in before starting implementation
3. Mark items complete as you go
4. Update `tasks/lessons.md` after corrections

## Core Principles
- Simplicity First - minimal code impact
- No Laziness - find root causes, senior dev standards
- Minimal Impact - only touch what's necessary

---

# Workflow Orchestration

## 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
