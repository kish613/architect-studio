// Architect Studio — Upload drop zone
function UploadDrop({onDone}) {
  const [step, setStep] = React.useState('idle'); // idle | processing | done
  const [fname, setFname] = React.useState('');
  const pick = () => {
    setFname('14-oak-lane-ground.png');
    setStep('processing');
    setTimeout(()=>setStep('done'), 1800);
  };
  return (
    <div className="app-screen" style={{maxWidth:760, margin:'0 auto'}}>
      <header className="app-screen-head" style={{borderBottom:'none', paddingBottom:0}}>
        <div>
          <div className="eyebrow">Step 1 of 3</div>
          <h1 className="t-h1" style={{margin:'4px 0 0'}}>Upload a floorplan</h1>
          <p className="t-lede" style={{margin:'6px 0 0', fontSize:14}}>PNG, JPG, or PDF. We'll extract walls, doors, and room boundaries.</p>
        </div>
      </header>
      <div className="app-upload-box" onClick={step==='idle'?pick:null}>
        {step==='idle' && <>
          <i data-lucide="upload-cloud" style={{width:40,height:40,color:'var(--primary)'}}></i>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,marginTop:14}}>Drop your floorplan here</div>
          <div style={{fontSize:13,color:'var(--fg-3)',marginTop:4}}>or click to browse — up to 20 MB</div>
          <div className="app-upload-formats">
            <span>PNG</span><span>JPG</span><span>PDF</span><span>SVG</span>
          </div>
        </>}
        {step==='processing' && <>
          <div className="app-spinner"><i data-lucide="loader-2"></i></div>
          <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,marginTop:14}}>Extracting geometry…</div>
          <div style={{fontSize:13,color:'var(--fg-3)',marginTop:4}}>Detecting walls, doors, windows from {fname}</div>
        </>}
        {step==='done' && <>
          <i data-lucide="check-circle-2" style={{width:40,height:40,color:'#10B981'}}></i>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,marginTop:14}}>Ready for BIM edit</div>
          <div style={{fontSize:13,color:'var(--fg-3)',marginTop:4}}>12 walls, 4 doors, 7 windows detected</div>
          <button className="btn btn-primary" style={{marginTop:18}} onClick={()=>onDone('bim')}>
            Open BIM editor<i data-lucide="arrow-right"></i>
          </button>
        </>}
      </div>
      <div className="app-upload-tips">
        <div className="app-tip"><i data-lucide="sparkles" style={{color:'var(--primary)'}}></i><div><strong>Tip</strong><p>Straight lines and clear annotations produce the most accurate 3D geometry.</p></div></div>
        <div className="app-tip"><i data-lucide="shield-check" style={{color:'#10B981'}}></i><div><strong>Private</strong><p>Plans are encrypted at rest and never used to train models.</p></div></div>
      </div>
    </div>
  );
}
window.UploadDrop = UploadDrop;
