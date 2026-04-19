// Architect Studio — BIM editor (tool rail, 2D canvas, inspector)
function BimEditor({onNext}) {
  const [tool, setTool] = React.useState('select');
  const tools = [
    {id:'select', icon:'mouse-pointer-2', label:'Select'},
    {id:'wall', icon:'minus', label:'Wall'},
    {id:'door', icon:'door-open', label:'Door'},
    {id:'window', icon:'square-dashed', label:'Window'},
    {id:'room', icon:'square', label:'Room'},
    {id:'furniture', icon:'armchair', label:'Furniture'},
    {id:'measure', icon:'ruler', label:'Measure'},
  ];
  return (
    <div className="app-bim">
      {/* Tool rail */}
      <div className="app-bim-rail">
        {tools.map(t => (
          <button key={t.id}
            className={`app-tool-btn ${tool===t.id?'active':''}`}
            onClick={()=>setTool(t.id)} title={t.label}>
            <i data-lucide={t.icon}></i>
          </button>
        ))}
        <div className="app-bim-rail-divider"/>
        <button className="app-tool-btn" title="Undo"><i data-lucide="undo-2"></i></button>
        <button className="app-tool-btn" title="Redo"><i data-lucide="redo-2"></i></button>
      </div>

      {/* Canvas */}
      <div className="app-bim-canvas">
        <div className="app-bim-canvas-head">
          <div className="app-bim-breadcrumb">
            <span>Oak Lane Extension</span>
            <i data-lucide="chevron-right"></i>
            <span style={{color:'var(--fg-1)'}}>Ground floor</span>
          </div>
          <div className="app-bim-canvas-actions">
            <div className="app-zoom"><button>−</button><span>100%</span><button>+</button></div>
            <button className="btn btn-ghost-sm"><i data-lucide="eye"></i>2D</button>
            <button className="btn btn-primary" onClick={onNext}><i data-lucide="box"></i>Render 3D</button>
          </div>
        </div>
        <div className="app-bim-canvas-body">
          <svg viewBox="0 0 600 420" style={{width:'100%',height:'100%'}}>
            {/* Grid */}
            <defs>
              <pattern id="bimGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
              </pattern>
              <pattern id="bimGridMajor" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="420" fill="url(#bimGrid)"/>
            <rect width="600" height="420" fill="url(#bimGridMajor)"/>
            {/* Floorplan */}
            <g stroke="#F97316" strokeWidth="3" fill="rgba(249,115,22,.04)">
              <rect x="80" y="80" width="440" height="260"/>
              <line x1="280" y1="80" x2="280" y2="220"/>
              <line x1="80" y1="220" x2="440" y2="220"/>
              <line x1="440" y1="220" x2="440" y2="340"/>
              <line x1="80" y1="220" x2="80" y2="340"/>
            </g>
            {/* Room labels */}
            <g fill="rgba(255,255,255,.6)" fontFamily="JetBrains Mono" fontSize="11">
              <text x="175" y="155">Kitchen · 18m²</text>
              <text x="380" y="155">Living · 24m²</text>
              <text x="175" y="290">Bed 1 · 14m²</text>
              <text x="340" y="290">Bed 2 · 12m²</text>
            </g>
            {/* Doors */}
            <g stroke="#00AEEF" strokeWidth="2" strokeDasharray="3,2" fill="none">
              <path d="M 280 180 Q 300 180 300 200"/>
              <path d="M 200 220 Q 200 240 220 240"/>
            </g>
            {/* Dimensions */}
            <g stroke="rgba(255,255,255,.3)" strokeWidth="1" fill="rgba(255,255,255,.5)" fontFamily="JetBrains Mono" fontSize="10">
              <line x1="80" y1="60" x2="520" y2="60"/>
              <line x1="80" y1="55" x2="80" y2="65"/>
              <line x1="520" y1="55" x2="520" y2="65"/>
              <text x="285" y="54" textAnchor="middle">12.45 m</text>
            </g>
            {/* Selection */}
            <rect x="275" y="75" width="10" height="150" fill="none" stroke="#F97316" strokeWidth="1.5" strokeDasharray="4,3"/>
          </svg>
        </div>
      </div>

      {/* Inspector */}
      <div className="app-bim-inspector">
        <div className="app-inspector-sec">
          <div className="eyebrow">Selection</div>
          <div style={{marginTop:8,fontFamily:'var(--font-display)',fontSize:15,fontWeight:600}}>Interior wall</div>
          <div style={{fontSize:12,color:'var(--fg-3)',marginTop:2}}>ID wall-04 · vertical</div>
        </div>
        <div className="app-inspector-sec">
          <div className="eyebrow">Geometry</div>
          <div className="app-row"><label>Length</label><input value="5.60 m" readOnly/></div>
          <div className="app-row"><label>Thickness</label><input value="0.10 m"/></div>
          <div className="app-row"><label>Height</label><input value="2.70 m"/></div>
        </div>
        <div className="app-inspector-sec">
          <div className="eyebrow">Material</div>
          <div className="app-material-row">
            {['#DDD5C4','#C9B896','#7C6F58','#3D3A35'].map(c=>(
              <button key={c} className="app-mat-swatch" style={{background:c}}/>
            ))}
          </div>
          <select className="app-select"><option>Painted plaster · matte</option></select>
        </div>
        <div className="app-inspector-sec">
          <div className="eyebrow">Openings</div>
          <div className="app-chip-row">
            <span className="chip"><i data-lucide="door-open"></i>Door · 0.80m</span>
            <span className="chip"><i data-lucide="square-dashed"></i>Window · 1.20m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
window.BimEditor = BimEditor;
