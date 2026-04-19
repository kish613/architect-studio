// Architect Studio — Planning Analysis (/planning)
function PlanningAnalysis() {
  const cases = [
    {ref:'APP/24/0182', addr:'12 Oak Lane, SW11', change:'Rear extension, 3.6m', status:'Approved', date:'Mar 2026'},
    {ref:'APP/24/0441', addr:'20 Oak Lane, SW11', change:'Loft dormer', status:'Approved', date:'Feb 2026'},
    {ref:'APP/23/0991', addr:'8 Elm Grove, SW11', change:'Side infill', status:'Approved', date:'Nov 2025'},
    {ref:'APP/24/0672', addr:'14 Cedar Ave, SW12', change:'Basement, 2 storey', status:'Pending', date:'Apr 2026'},
  ];
  return (
    <div className="app-screen">
      <header className="app-screen-head">
        <div style={{minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
            <h1 className="t-h1" style={{margin:0,whiteSpace:'nowrap'}}>Planning Analysis</h1>
            <span className="chip-beta">Beta</span>
          </div>
          <div style={{height:3,width:56,background:'linear-gradient(90deg,#F97316,rgba(249,115,22,.2))',borderRadius:9999,marginBottom:10}}/>
          <p className="t-lede" style={{margin:0,fontSize:14}}>Visualise planning-approved modifications for your property.</p>
        </div>
        <button className="btn btn-primary"><i data-lucide="plus"></i>New Analysis</button>
      </header>

      {/* AI insight */}
      <div className="dark-glass" style={{padding:20, borderRadius:24, display:'flex', gap:16, alignItems:'flex-start', marginBottom:32}}>
        <div className="app-icon-chip" style={{background:'rgba(249,115,22,.2)'}}><i data-lucide="sparkles" style={{color:'#F97316'}}></i></div>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,marginBottom:3}}>AI-Powered Planning Insights</div>
          <div style={{fontSize:13,color:'var(--fg-2)',lineHeight:1.55}}>Upload a photo of your property and we'll analyse it, search for similar planning approvals nearby, and generate visualisations of potential modifications based on what's been approved in your area.</div>
        </div>
      </div>

      <div className="eyebrow" style={{marginBottom:16}}>4 approvals within 500m</div>
      <div className="app-planning-grid">
        {cases.map(c => (
          <article key={c.ref} className="app-planning-card">
            <div className="app-planning-map" style={{background:`linear-gradient(135deg,${c.status==='Approved'?'#10B981':'#F59E0B'}20,#111)`}}>
              <div className="app-planning-pin"><i data-lucide="map-pin"></i></div>
              <div className={`app-status ${c.status.toLowerCase()}`}>{c.status}</div>
            </div>
            <div style={{padding:'14px 16px'}}>
              <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--fg-3)'}}>{c.ref} · {c.date}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,marginTop:3}}>{c.addr}</div>
              <div style={{fontSize:13,color:'var(--fg-2)',marginTop:4}}>{c.change}</div>
              <button className="btn btn-ghost-sm" style={{marginTop:12,padding:'6px 10px'}}>
                Generate proposal<i data-lucide="arrow-right"></i>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
window.PlanningAnalysis = PlanningAnalysis;
