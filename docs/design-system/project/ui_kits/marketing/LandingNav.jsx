// Architect Studio — Landing Nav (floating pill + animated logo)
function LandingNav() {
  const [authed, setAuthed] = React.useState(false);
  return (
    <nav className="as-nav">
      <a href="#" className="as-logo-link" aria-label="Architect Studio">
        <img src="../../assets/logo-architect-studio.svg" alt="" className="as-logo-svg"/>
      </a>
      <div className="as-nav-pill">
        {['Floorplans','Permissions','3D Render','Pricing'].map((l,i)=>(
          <span key={l} className={`as-nav-link ${i===0?'active':''}`}>{l}</span>
        ))}
      </div>
      <div className="as-nav-right">
        {authed ? (
          <>
            <div className="as-avatar"><i data-lucide="user"></i></div>
            <button className="btn btn-primary" onClick={()=>setAuthed(false)}>
              <span>New Project</span><i data-lucide="plus-circle"></i>
            </button>
          </>
        ) : (
          <>
            <button className="as-icon-btn" title="Email sign-in"><i data-lucide="mail"></i></button>
            <button className="as-icon-btn" title="Google sign-in"><i data-lucide="user-circle"></i></button>
            <button className="btn btn-primary" onClick={()=>setAuthed(true)}>
              <span>Get Started</span><i data-lucide="plus-circle"></i>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
window.LandingNav = LandingNav;
