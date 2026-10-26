# Coordinator and agent responsibilities

- Status: accepted
- Owner: User
- Date: 2026-10-27

## Context

The project is built with Claude and Codex under one coordinating conversation.

## Decision

The main chat is the coordinator. Claude leads technical decisions. Codex handles vision, review and small tasks from Claude-prepared briefs. The user owns product direction. Parallel writers need disjoint scopes; agents are launched only on the user's explicit request.

## Alternatives and rationale

Template source: the user's Agent-Project-Starter. Adapted: memory is plain Markdown in `docs/` instead of an in-repo Obsidian vault, because the repository holds no notes-vault files.

## Participants and acceptance evidence

User requested the workflow on 2026-10-27 and approved the repository/vault split. Implemented by `AGENTS.md` and `docs/agents/`.

## Consequences

Briefs are required for delegated coding work; reviews must state their independence.
