// Architect Studio — Footer
function Footer() {
  return (
    <footer className="as-footer">
      <div className="as-footer-inner">
        <div className="as-footer-brand">
          <img src="../../assets/logo-mark-dark.svg" style={{width:24,height:24}}/>
          <span style={{fontFamily:'Montserrat,sans-serif',fontWeight:700,letterSpacing:'-0.5px'}}>
            <span style={{color:'#fff'}}>Architect</span> <span style={{color:'#00AEEF',fontWeight:400}}>Studio</span>
          </span>
        </div>
        <nav className="as-footer-links">
          <a>Floorplans</a><a>Planning</a><a>Pricing</a><a>Docs</a><a>Contact</a>
        </nav>
        <div className="as-footer-copy">© {new Date().getFullYear()} Architect Studio · London</div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
