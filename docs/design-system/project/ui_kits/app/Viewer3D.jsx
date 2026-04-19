// Architect Studio — 3D Present (isometric viewer)
function Viewer3D() {
  const [view, setView] = React.useState('iso');
  return (
    <div className="app-viewer">
      <div className="app-viewer-topbar">
        <div className="app-bim-breadcrumb">
          <span>Oak Lane Extension</span>
          <i data-lucide="chevron-right"></i>
          <span style={{color:'var(--fg-1)'}}>Render v3</span>
        </div>
        <div className="app-viewer-segments">
          {[['iso','box','Isometric'],['top','square','Top'],['walk','footprints','Walk']].map(([id,icon,label])=>(
            <button key={id} className={`app-seg-btn ${view===id?'active':''}`} onClick={()=>setView(id)}>
              <i data-lucide={icon}></i>{label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost-sm"><i data-lucide="share-2"></i>Share</button>
          <button className="btn btn-primary"><i data-lucide="download"></i>Export</button>
        </div>
      </div>

      <div className="app-viewer-stage">
        {/* SVG placeholder isometric render */}
        <svg viewBox="0 0 600 420" style={{width:'100%',height:'100%'}}>
          <defs>
            <linearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B7E6B"/><stop offset="100%" stopColor="#5A4F41"/>
            </linearGradient>
            <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EDE7D8"/><stop offset="100%" stopColor="#C4BCA8"/>
            </linearGradient>
            <linearGradient id="wallShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9A917F"/><stop offset="100%" stopColor="#746A57"/>
            </linearGradient>
          </defs>
          {/* floor */}
          <path d="M 120 240 L 300 160 L 480 240 L 300 320 Z" fill="url(#floorGrad)" stroke="#2A2520" strokeWidth="1"/>
          {/* back walls (shaded) */}
          <path d="M 120 240 L 300 160 L 300 100 L 120 180 Z" fill="url(#wallShade)" stroke="#2A2520" strokeWidth="1"/>
          <path d="M 300 160 L 480 240 L 480 180 L 300 100 Z" fill="url(#wallGrad)" stroke="#2A2520" strokeWidth="1"/>
          {/* interior divider */}
          <path d="M 210 200 L 390 280 L 390 220 L 210 140 Z" fill="rgba(237,231,216,.5)" stroke="rgba(42,37,32,.5)" strokeWidth="1"/>
          {/* furniture hints */}
          <rect x="160" y="230" width="40" height="20" fill="#c19a6b" opacity=".9" transform="skewX(-27)"/>
          <rect x="350" y="260" width="50" height="24" fill="#4a7c8c" opacity=".9" transform="skewX(-27)"/>
          <circle cx="410" cy="210" r="8" fill="#F97316" opacity=".8"/>
          {/* cyan window highlight */}
          <rect x="420" y="190" width="30" height="20" fill="#00AEEF" opacity=".4" transform="skewY(-27) skewX(0)"/>
          {/* scale ruler */}
          <g stroke="rgba(255,255,255,.3)" strokeWidth="1" fill="rgba(255,255,255,.5)" fontFamily="JetBrains Mono" fontSize="10">
            <line x1="120" y1="360" x2="480" y2="360"/>
            <text x="300" y="378" textAnchor="middle">12.45 m</text>
          </g>
        </svg>
        {/* floating camera ctrl */}
        <div className="app-viewer-camera">
          <button><i data-lucide="rotate-ccw"></i></button>
          <button><i data-lucide="move"></i></button>
          <button><i data-lucide="maximize"></i></button>
          <button><i data-lucide="sun"></i></button>
        </div>
        {/* floating layers */}
        <div className="app-viewer-layers">
          <div className="eyebrow" style={{marginBottom:8}}>Layers</div>
          {[['Walls',true],['Furniture',true],['Lighting',true],['Textures',false]].map(([l,on])=>(
            <label key={l} className="app-layer-row">
              <input type="checkbox" defaultChecked={on}/>{l}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
window.Viewer3D = Viewer3D;
