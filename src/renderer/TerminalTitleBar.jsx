import React from 'react';
import './TerminalTitleBar.css';


const TerminalTitleBar = () => {
  return(
    <div className="titlebar">
      <div className="titlebar-left">
        <span className="titlebar-appname">🧠 Second Brain</span>
        <span className="titlebar-divider">|</span>
        <span className="titlebar-label">Terminal</span>
      </div>
      <div className="titlebar-controls">
          <button className="titlebar-btn yellow" onClick={()=>{
            window.brainAPI.minimize();
          }}>–</button>
          <button className="titlebar-btn green"
          onClick={()=>{
            window.brainAPI.maximize();
          }}>▢</button>
          <button className="titlebar-btn red"
          onClick={()=>{
            window.brainAPI.close();
          }}>×</button>
      </div>
    </div>
);
}
  
  



export default TerminalTitleBar;
