// Architect Studio — Hero frame with animated photo grid + glass text overlay
function HeroFrame() {
  // Unsplash-style placeholder architectural photos — we use gradient tiles so the kit works offline.
  // Swap these for real imagery from attached_assets once reattached.
  const tiles = [
    ['#1e3a8a','#0ea5e9'],['#64748b','#94a3b8'],['#0f172a','#f97316'],['#334155','#e2e8f0'],
    ['#1e293b','#38bdf8'],['#475569','#cbd5e1'],['#020617','#f59e0b'],['#1e3a8a','#fde68a'],
    ['#0f172a','#94a3b8'],['#1e293b','#fb923c'],['#334155','#ffffff'],['#0c4a6e','#e2e8f0'],
  ];
  return (
    <div className="as-hero-frame">
      <div className="as-hero-grid-wrap">
        <div className="as-hero-grid">
          {[0,1,2].map(row => (
            <div key={row} className={`as-hero-row as-hero-row-${row}`}>
              {tiles.map((g,i)=>(
                <div key={i} className="as-hero-tile" style={{background:`linear-gradient(135deg, ${g[0]}, ${g[1]})`}}/>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="as-hero-glass-card"/>
      <div className="as-hero-overlay">
        <h1 className="as-hero-title">
          Intelligent 3D Floorplans for <span className="t-gradient-blueprint">Modern Living</span>
        </h1>
        <p className="as-hero-sub">
          Transform sketches into professional 3D models and planning permission documents instantly.
          Precision drafting for architects and homeowners.
        </p>
        <div className="as-hero-ctas">
          <button className="btn btn-hero-primary"><i data-lucide="pen-square"></i>Start Designing</button>
          <button className="btn btn-hero-secondary"><i data-lucide="play-circle"></i>View Demo</button>
        </div>
      </div>
    </div>
  );
}
window.HeroFrame = HeroFrame;
