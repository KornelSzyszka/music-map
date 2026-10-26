---
name: agent-evidence-review
description: Review code, specifications or experimental results against a project's accepted contracts and evidence, with Codex leading review and preserving the requested write boundary.
---

# Review evidence

Read `AGENTS.md`, the relevant brief and `docs/agents/roles-and-routing.md`. Codex leads review. Determine the actual artifact, revision, author, claim and available evidence before expanding context.

Respect the write boundary. A review produces findings without editing the reviewed artifact unless the user requests a fix. Use `templates/review.md` as needed. Self-review is not independent review; do not invent reviewer independence or start another agent without authorization.

For code or specification review, trace affected inputs, contracts, state, effects, errors and callers. Prioritize concrete defects with a location, trigger, consequence and supporting evidence. Distinguish a verified failure, evidence-backed reasoning and an unverified concern.

For experimental comparisons, identify the independent variable, shared inputs, controlled conditions and units. Check whether differences attributed to architecture or implementation could come from changed domain logic or assumptions. Separate simulated results, local measurements and real-world evidence.

Codex may challenge Claude's technical choices. Prepare a concrete disagreement for joint resolution; do not silently replace the accepted contract. No findings means no actionable defect found within the inspected scope, not proof of universal correctness.

Report findings or bounded results, checks performed, missing evidence and the next useful action. Apply `docs/agents/memory-policy.md` to durable conclusions.
