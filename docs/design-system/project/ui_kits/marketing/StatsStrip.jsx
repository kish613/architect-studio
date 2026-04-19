// Architect Studio — Stats strip (weavy panels, floating animation)
function StatsStrip() {
  const stats = [
    {icon:'box',color:'#0891B2',value:'50K+',label:'Blueprints Generated',delay:'0s'},
    {icon:'file-check',color:'#F97316',value:'100%',label:'Planning Compliant',delay:'1s'},
    {icon:'sparkles',color:'#10B981',value:'0.5s',label:'Rendering Time',delay:'2s'},
  ];
  return (
    <div className="as-stats">
      {stats.map(s => (
        <div key={s.label} className="as-stat-card" style={{animationDelay:s.delay}}>
          <i data-lucide={s.icon} style={{color:s.color,width:28,height:28}}></i>
          <div className="as-stat-value">{s.value}</div>
          <div className="as-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
window.StatsStrip = StatsStrip;
