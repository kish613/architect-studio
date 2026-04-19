// Architect Studio — Featured projects grid
function FeatureGrid() {
  const projects = [
    {name:'Oak Lane Extension',loc:'SW11',rooms:5,pal:['#1e3a8a','#0ea5e9']},
    {name:'Victorian Terrace',loc:'E2',rooms:3,pal:['#0f172a','#f97316']},
    {name:'Garden Studio',loc:'N16',rooms:1,pal:['#334155','#e2e8f0']},
    {name:'Loft Conversion',loc:'SE15',rooms:4,pal:['#1e293b','#fb923c']},
    {name:'Mews House',loc:'W1',rooms:6,pal:['#020617','#f59e0b']},
    {name:'Barn Conversion',loc:'OX1',rooms:8,pal:['#0c4a6e','#38bdf8']},
  ];
  return (
    <section className="as-featured">
      <div className="as-featured-head">
        <div>
          <div className="eyebrow">Recent renders</div>
          <h2 className="t-h2" style={{margin:'4px 0 0'}}>Featured Projects</h2>
        </div>
        <button className="btn btn-ghost">View all<i data-lucide="arrow-right"></i></button>
      </div>
      <div className="as-featured-grid">
        {projects.map(p => (
          <article key={p.name} className="as-project-card">
            <div className="as-project-image" style={{background:`linear-gradient(135deg,${p.pal[0]},${p.pal[1]})`}}>
              <div className="as-project-badge"><i data-lucide="box"></i>3D Model</div>
            </div>
            <div className="as-project-body">
              <div className="as-project-name">{p.name}</div>
              <div className="as-project-meta">
                <span><i data-lucide="map-pin"></i>{p.loc}</span>
                <span><i data-lucide="layout"></i>{p.rooms} rooms</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
window.FeatureGrid = FeatureGrid;
