// Architect Studio — App sidebar (fixed rail with workspace nav)
function Sidebar({current, onNav}) {
  const items = [
    {id:'projects', icon:'layout-grid', label:'Projects'},
    {id:'upload', icon:'upload-cloud', label:'Upload'},
    {id:'bim', icon:'ruler', label:'BIM Edit'},
    {id:'present', icon:'box', label:'3D Present'},
    {id:'planning', icon:'search', label:'Planning'},
  ];
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo">
        <img src="../../assets/logo-mark-dark.svg" alt="Architect Studio" style={{width:32,height:32}}/>
      </div>
      <nav className="app-sidebar-nav">
        {items.map(it => (
          <button key={it.id}
            className={`app-rail-btn ${current===it.id?'active':''}`}
            onClick={()=>onNav(it.id)}
            title={it.label}>
            <i data-lucide={it.icon}></i>
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-rail-btn" title="Settings"><i data-lucide="settings"></i><span>Settings</span></button>
        <div className="app-user"><div className="app-avatar"><i data-lucide="user"></i></div></div>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;
