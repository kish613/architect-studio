# Architect Studio Bootstrap Roadmap

Date: 2026-03-17
Owner: CEO
Source Issue: INT-1
Workspace: /Users/kivateit/Documents/Documents/GitHub/architect-studio

## Executive Summary

Architect Studio already has a working React + Vite application with auth, project upload, planning flows, subscription plumbing, and an existing CAD viewer. The highest-leverage move is not greenfield product definition. It is to turn the approved 3D floorplan editor direction into a shipped vertical slice inside the current codebase.

The company thesis for the next execution window is simple: help homeowners and small residential design teams move from planning analysis to editable 3D floorplan concepts faster, with a workflow that is visual, credible, and easier to iterate than static reports.

## Current State

- Frontend stack: React 19, Vite 7, TanStack Query, Radix UI, Tailwind.
- Backend shape: Vercel-style API routes with auth, planning, project, Stripe, and subscription endpoints.
- 3D capability already exists through the current CAD viewer and Three.js/R3F dependencies.
- Strategy artifacts already exist for the next major product move:
  - `docs/plans/2026-03-17-3d-floorplan-editor-design.md`
  - `docs/plans/2026-03-17-3d-floorplan-editor-implementation.md`
- Main gap: no active engineering owner is attached to this live workspace, and the earlier bootstrap/hire flow targeted a different directory.

## Product Thesis

### Target User

- Homeowners exploring extension options.
- Residential architects or planning consultants who need faster concept iteration.

### Core Pain Point

- Existing planning outputs are informative but not editable enough.
- The current CAD workflow gives geometry, but not a full scene editor with reusable architectural objects and structured persistence.

### Core Loop

1. User uploads or selects a planning/project context.
2. System generates planning analysis and proposes extension concepts.
3. User opens an editable 3D floorplan editor.
4. User modifies walls, openings, levels, and zones.
5. User saves, exports, or uses the design as the basis for the next commercial step.

### Success Metric

- A user can load a project and reach an editable, saveable floorplan scene in one session without manual engineering support.

## Near-Term Strategy

### Phase 1: Re-anchor Operations

- Install the CEO operating files in the active repo.
- Point the live CEO agent at this workspace.
- Hire a Founding Engineer aligned to this repo instead of the stale Desktop workspace.

### Phase 2: Validate the Technical Direction

- Confirm that the Pascal deep-merge strategy is still the fastest route.
- Audit the current CAD stack, planning routes, schema, and API surface against the approved design docs.
- Produce a tightened implementation path for the first shippable slice.

### Phase 3: Ship the First Vertical Slice

- Replace the current `/planning/:id/cad` experience with the foundation of the floorplan editor.
- Land scene schema, persistence, route integration, and core canvas/editor shell.
- Keep scope narrow enough to demo, save, and iterate in the live app.

### Phase 4: Add Differentiators

- AI floorplan generation from uploaded plans.
- Export flows.
- Credit-aware premium workflows tied into the existing subscription system.

## Immediate Execution Priorities

### CEO

- Keep the company aligned on the floorplan-editor-first strategy.
- Secure approval for the updated strategy and replacement engineer hire.
- Maintain backlog quality and remove stale workspace ambiguity.

### Founding Engineer

- Audit the repo against the approved design and implementation docs.
- Convert that audit into a concrete phase-by-phase execution sequence with risk notes.
- Implement the smallest production-ready editor slice inside the current app.

## Initial Task Set

1. Audit the active workspace against the approved 3D floorplan editor design.
2. Implement Phase 1 foundation for the floorplan editor in the live repo.
3. Keep CEO operating cadence and backlog hygiene in place while engineering starts.

## Risks

- Duplicate historical CEO agents and approvals can confuse ownership unless the active workspace is stated explicitly.
- The existing pending Founding Engineer hire is tied to `/Users/kivateit/Desktop/Paperclip` and should not be treated as the active execution path.
- The repo has some local environment friction already, including broken git worktree metadata, so the engineer should expect light cleanup during technical discovery.

## Decision

Do not restart strategy from scratch. Use the existing Architect Studio product and approved floorplan editor direction as the operating base, and staff execution around the live repository.
