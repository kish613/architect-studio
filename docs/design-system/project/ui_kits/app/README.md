# Architect Studio — App UI Kit

Recreates the in-product floorplan workspace. Surfaces covered:
- **Projects grid** — entry point, based on `/projects`
- **Upload** — floorplan drop zone, based on `/upload`
- **BIM editor** — left tool rail, 2D canvas, right inspector, based on `/planning/:id/bim`
- **3D Present** — isometric viewer with camera controls, based on `/planning/:id/present`
- **Planning Analysis** — property card + AI insight, based on `/planning`

## Files
- `index.html` — tabbed demo of all 5 screens
- `Sidebar.jsx`, `TopBar.jsx`, `ProjectsGrid.jsx`, `UploadDrop.jsx`, `BimEditor.jsx`, `Viewer3D.jsx`, `PlanningAnalysis.jsx`
- `styles.css`

Based on `client/src/pages/*` and `client/src/components/*` in `kish613/architect-studio`.
