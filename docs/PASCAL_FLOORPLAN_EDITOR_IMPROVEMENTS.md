# Pascal Floorplan Editor — Improvement Suggestions

This document captures improvement suggestions for the Pascal-based floorplan editor (forked on `feature/3d-floorplan-editor`). Items are ordered by priority.

---

## Critical Issues (fix before merging)

### 1. `useAutoSave()` is never called — auto-save is dead code

The hook exists at `client/src/hooks/use-auto-save.ts` but is never invoked in `FloorplanEditor.tsx` or `FloorplanEditorPage.tsx`. Users will lose all work if they close the tab. Related: there's no `beforeunload` handler either.

### 2. `"fallback-secret"` JWT vulnerability

Every API file under `api/floorplans/` has this:

```typescript
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
```

If `SESSION_SECRET` is unset in production, anyone can forge authentication tokens with the known string. This should throw instead of falling back.

### 3. Schema/auth/helpers copy-pasted into every API file

The `floorplanDesigns` table definition, `getDb()`, `getSessionFromCookies()`, and `verifySession()` are duplicated verbatim in `index.ts`, `[id].ts`, `generate-from-image.ts`, `assets.ts`, and `project/[projectId].ts`. The shared schema in `shared/schema.ts` already defines `floorplanDesigns` but none of the API files import it. A change to the table requires editing 5+ files.

### 4. Node type system redefined in `generate-from-image.ts`

The 552-line endpoint redefines all node interfaces (~100 lines) that already exist in `client/src/lib/pascal/schemas.ts`. The server-side copy is also incomplete — it only defines `SiteNode | BuildingNode | LevelNode | WallNode | DoorNode | WindowNode`, missing zone, slab, ceiling, roof, item, guide, and scan types. These types should live in a shared package importable by both client and server.

---

## Three.js Memory Leaks (High Severity)

### 5. Geometry and material objects are never disposed

Every system file (`wall-system.ts`, `door-system.ts`, `window-system.ts`, etc.) creates `new THREE.BoxGeometry(...)` and `new THREE.MeshStandardMaterial(...)` inside functions called from `useMemo`. When nodes change, old geometries and materials are orphaned — they're never `.dispose()`d. In an editor where users add/remove walls constantly, this leaks GPU memory steadily.

Example in `wall-system.ts`:

```typescript
export function getWallMaterial(wall: WallNode, isSelected: boolean, isHovered: boolean): THREE.MeshStandardMaterial {
  const color = isSelected ? "#4A90FF" : isHovered ? "#78B4FF" : (WALL_MATERIALS[wall.material ?? "plaster"] ?? "#f5f0e8");
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }); // leaked on every call
}
```

This function is called every time `isSelected` or `isHovered` changes, creating a new material each time. Materials should be cached/pooled and disposed on unmount.

---

## State Management Issues

### 6. Zustand stores subscribed without selectors

Multiple components subscribe to the entire store when they only need 1-2 fields:

- `EditorToolbar` uses `useEditor()` but only needs `activeTool` and `setTool`. When `drawingPoints` or `previewPoint` update (every mouse move during drawing), the toolbar re-renders.
- `SceneRenderer` uses `useScene()` for `nodes` and `useViewer()` for visibility flags. Any viewer state change (hover, selection) re-renders the entire scene.
- `PropertyPanel` uses both `useViewer()` and `useScene()` without selectors.

**Fix:** Use selectors, e.g. `useEditor(s => s.activeTool)` or `useEditor(s => ({ activeTool: s.activeTool, setTool: s.setTool }))`.

### 7. `useScene` undo/redo equality check uses `JSON.stringify`

```typescript
equality: (pastState, currentState) =>
  JSON.stringify(pastState.nodes) === JSON.stringify(currentState.nodes),
```

For a scene with hundreds of nodes, `JSON.stringify` on every state change is expensive. Consider a structural comparison or a version counter.

### 8. `dirtyNodeIds` is a `Set` stored in Zustand

Sets don't trigger re-renders in Zustand properly because `Set` reference equality is tricky. Every mutation creates `new Set([...state.dirtyNodeIds, nodeId])`, which works, but the spread-into-new-Set pattern is O(n) on every edit. For dirty tracking, a simple counter or version number would be more efficient.

---

## PropertyPanel Data Corruption

### 9. `parseFloat` on every keystroke writes NaN to the store

```typescript
onChange={(e) => updateNode(node.id, { height: parseFloat(e.target.value) })}
```

Typing "2." produces `NaN`. Clearing the field produces `NaN`. There's no local state buffer, no debouncing, and no validation. Every keystroke triggers a store update which triggers a scene re-render and an undo history snapshot.

**Fix:** Use local state for the input value, debounce (e.g. 300ms), validate before calling `updateNode`, and guard against `NaN`.

---

## API Design Issues

### 10. List endpoints return full `sceneData`

Both `api/floorplans/index.ts` (GET) and `api/floorplans/project/[projectId].ts` return all columns including `sceneData`, which can be megabytes of JSON per floorplan. The list endpoints should only return metadata (id, name, thumbnailUrl, updatedAt).

### 11. No file size limits on uploads

`generate-from-image.ts` and `assets.ts` read the entire request body into memory with no size check. A malicious user can send gigabytes and OOM the serverless function. Check `Content-Length` header early and reject requests over a threshold (e.g. 10MB).

### 12. `assets.ts` has no ownership verification

Any authenticated user can upload assets to any floorplan's blob path. The handler checks authentication but never verifies the user owns the floorplan.

### 13. Race condition on credit deduction

Credits are checked with `canUserGenerate()`, then the expensive Gemini call happens, then `deductCredit()` runs. The comment even acknowledges it: `"possible race condition, continuing anyway"`. Two concurrent requests can both pass the check and both consume credits incorrectly (or bypass limits). Use a database transaction or atomic check-and-deduct.

---

## Missing Functionality

### 14. No keyboard shortcuts

An editor with 14 tools has no keyboard shortcut handling. No `V` for select, `W` for wall, `Escape` to cancel, `Ctrl+Z` for undo. The `useSceneHistory` undo/redo is exported but never wired to any UI.

### 15. `SelectionManager` component renders `null`

```typescript
export function SelectionManager() {
  return null;
}
```

The component is imported but does nothing. Selection logic is in `useSelectionClick()` hook, but it's never called from `FloorplanCanvas` or any parent. Click-to-select is non-functional.

### 16. No drawing/placement interaction

The `EditorTool` type defines wall/door/window drawing tools, and `useEditor` tracks `phase`, `drawingPoints`, and `previewPoint`, but no component reads these to implement the actual drawing interaction. The tools exist in the toolbar but clicking them does nothing beyond highlighting the button.

### 17. `SaveIndicator` "saved X ago" never updates

The time-ago label is computed from `Date.now() - lastSavedAt` but there's no re-render trigger. It will show "just now" forever after saving. Add a `setInterval` (e.g. every 30 seconds) to force periodic re-render.

---

## Architecture & Code Quality

### 18. `createNode` uses `as unknown as` type assertion

```typescript
return base as unknown as Extract<AnyNode, { type: T }>;
```

This bypasses the type system entirely. The `base` object doesn't include type-specific fields (like `start`/`end` for walls), so the returned object is structurally invalid for most node types. Use the Zod schema `.parse()` to validate.

### 19. Event bus is a singleton but never cleaned up

`eventBus` is a module-level singleton. Events are emitted from the store (`node:created`, `node:deleted`, etc.) but no component subscribes to them. If this is for future plugin/extension support, document it. If not, remove or wire it up.

### 20. `SceneRegistry` is a global singleton with no lifecycle management

`sceneRegistry` maps node IDs to Three.js objects via ref callbacks. If the `FloorplanEditorPage` unmounts and remounts (e.g. navigating away and back), the registry retains stale references. Call `clear()` on unmount.

### 21. `LevelNavigator` filtering and sorting runs every render

```typescript
const levels = Object.values(nodes)
  .filter((n): n is LevelNode => n.type === "level" && ...)
  .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
```

No `useMemo`. Recalculated on every render, including unrelated state changes. Wrap in `useMemo` keyed on `[nodes, activeBuildingId]`.

---

## Summary by Priority

| Priority | Issue | Fix Effort |
|----------|-------|------------|
| **P0 - Security** | `"fallback-secret"` JWT (#2), no upload size limits (#11), no asset ownership check (#12) | Low |
| **P0 - Broken** | `useAutoSave` never called (#1), selection doesn't work (#15), drawing tools do nothing (#16) | Medium |
| **P1 - Memory** | Three.js geometry/material leaks (#5) | Medium |
| **P1 - DRY** | Schema/auth/types duplicated 5x (#3, #4) | Medium |
| **P1 - Data** | `parseFloat` → NaN corruption (#9), credit race condition (#13) | Low–Medium |
| **P2 - Perf** | Zustand unselectored subscriptions (#6), JSON.stringify undo check (#7), unmemoized filtering (#21) | Low |
| **P2 - UX** | No keyboard shortcuts (#14), save indicator stale (#17), no beforeunload warning | Low |
| **P3 - API** | Full sceneData in list responses (#10), inline schemas (#3) | Low |
| **P3 - Arch** | `createNode` type unsafety (#18), stale registry (#20), unused event bus (#19) | Low |

---

## Notes

The core architecture (Zod schemas, scene tree, Zustand + zundo, Three.js rendering pipeline) is solid and well-thought-out. The main gaps are in wiring things together — auto-save, selection, drawing interactions, and keyboard shortcuts are all *built* at the store/hook level but never connected to the UI. The security issues in the API layer are the most urgent to address.
