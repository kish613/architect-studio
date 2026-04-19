// Architect Studio — Projects grid (entry point at /projects)
function ProjectsGrid({onOpen}) {
  const projects = [
    {name:'Oak Lane Extension', loc:'SW11', rooms:5, models:3, thumb:'linear-gradient(135deg,#1e3a8a,#0ea5e9)'},
    {name:'Victorian Terrace', loc:'E2', rooms:3, models:2, thumb:'linear-gradient(135deg,#0f172a,#f97316)'},
    {name:'Garden Studio', loc:'N16', rooms:1, models:5, thumb:'linear-gradient(135deg,#334155,#e2e8f0)'},
    {name:'Loft Conversion', loc:'SE15', rooms:4, models:2, thumb:'linear-gradient(135deg,#1e293b,#fb923c)'},
    {name:'Mews House', loc:'W1', rooms:6, models:4, thumb:'linear-gradient(135deg,#020617,#f59e0b)'},
    {name:'Barn Conversion', loc:'OX1', rooms:8, models:1, thumb:'linear-gradient(135deg,#0c4a6e,#38bdf8)'},
  ];
  return (
    <div className="app-screen">
      <header className="app-screen-head">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1 className="t-h1" style={{margin:'4px 0 0'}}>Projects</h1>
          <p className="t-lede" style={{margin:'6px 0 0', fontSize:14}}>Every floorplan you've converted, grouped by property.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>onOpen('upload')}>
          <i data-lucide="plus"></i>New Project
        </button>
      </header>
      <div className="app-project-grid">
        {projects.map(p => (
          <article key={p.name} className="app-project-card" onClick={()=>onOpen('bim')}>
            <div className="app-project-thumb" style={{background:p.thumb}}>
              <div className="app-project-badge"><i data-lucide="box"></i>{p.models} models</div>
            </div>
            <div className="app-project-body">
              <div className="app-project-title">{p.name}</div>
              <div className="app-project-meta">
                <span><i data-lucide="map-pin"></i>{p.loc}</span>
                <span><i data-lucide="layout"></i>{p.rooms} rooms</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
window.ProjectsGrid = ProjectsGrid;
