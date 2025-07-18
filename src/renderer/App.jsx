import React from 'react';
import '../global.css';
import TerminalTitleBar from './TerminalTitleBar';
import TerminalView from './Terminal';

export default function App() {

  return(
    <div className="app-container">
  <TerminalTitleBar />
  <TerminalView />
</div>
  );

}
