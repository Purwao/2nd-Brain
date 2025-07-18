import React, {
  useEffect, useRef, useImperativeHandle, forwardRef, useCallback,
} from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { KEYS, ANSI, ASCII_BANNER } from '../utils/TerminalConstant';

const TerminalView = forwardRef(({ onCommand, promptSymbol = '$' }, ref) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(new FitAddon());

  const inputBuffer = useRef('');
  const history = useRef([]);
  const historyIndex = useRef(-1);
  const isMultiline = useRef(false);
  const currentDir = useRef('~');
  const confirmation = useRef(null);

  const USER = window.systemInfo.user;
  const HOST = window.systemInfo.host;

  const TAGS = ['--tag='];

  const COMMANDS = {
    async addnote(args) {
      const fullInput = args.join(' ');
      if (!fullInput) return 'Usage: addnote <text> [--tag=tag1,tag2]';
      const tagMatch = fullInput.match(/--tag=([^\s]+)/);
      let tags = [];
      let text = fullInput;

      if (tagMatch) {
        tags = tagMatch[1].split(',').map(t => t.trim()).filter(Boolean);
        text = fullInput.replace(tagMatch[0], '').trim();
      }

      if (!tags.length) {
        tags = await window.brainAPI.classify(text);
      }

      await window.brainAPI.addNote({ text, tags });
      return `✅ Note saved with tags: ${tags.join(', ')}`;
    },
    async shownotes() {
      const notes = await window.brainAPI.getNotes();
      if (!notes.length) return 'No notes yet.';
      const pad = (text, width) => {
        const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
        return clean.length > width ? text.slice(0, width - 3) + '...' : text + ' '.repeat(width - clean.length);
      };
      const MAX_CONTENT_LEN = 40;
      const header = `${ANSI.bold}${pad('ID', 5)} | ${pad('Content', MAX_CONTENT_LEN)} | Tags${ANSI.reset}`;
      const separator = '-'.repeat(70);
      const rows = notes.map(note => {
        const id = pad(`#${note.id}`, 5);
        const content = pad(note.content, MAX_CONTENT_LEN);
        const tags = Array.isArray(note.tags) ? note.tags.join(', ') : (note.tags || 'no-tags');
        return `${id} | ${content} | ${tags}`;
      });
      return [header, separator, ...rows].join('\r\n');
    },
    async filternotes(args) {
      const tag = args[0];
      if (!tag) return 'Usage: filternotes <tag>';
      const notes = await window.brainAPI.getFilteredTags(tag);
      const filtered = notes.filter(note => {
        const tags = Array.isArray(note.tags) ? note.tags : (typeof note.tags === 'string' ? note.tags.split(',') : []);
        return tags.includes(tag);
      });
      if (!filtered.length) return `No notes found with tag "${tag}".`;
      const pad = (text, width) => {
        const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
        return clean.length > width ? text.slice(0, width - 3) + '...' : text + ' '.repeat(width - clean.length);
      };
      const header = `${ANSI.bold}${pad('ID', 5)} | ${pad('Content', 40)} | Tags${ANSI.reset}`;
      const separator = '-'.repeat(70);
      const rows = filtered.map(note => {
        const id = pad(`#${note.id}`, 5);
        const content = pad(note.content, 40);
        const tags = Array.isArray(note.tags) ? note.tags.join(', ') : note.tags;
        return `${id} | ${content} | ${tags}`;
      });
      return [header, separator, ...rows].join('\r\n');
    },
    async showtags() {
      const tags = await window.brainAPI.getTags();
      if (!tags.length) return 'No tags found.';
      const tagWidth = Math.max(...tags.map(t => t.length)) + 4;
      const lines = tags.reduce((acc, tag, i) => {
        if (i % 4 === 0) acc.push([]);
        acc[acc.length - 1].push(tag.padEnd(tagWidth));
        return acc;
      }, []).map(group => group.join(''));
      return `${ANSI.bold}Tags:${ANSI.reset}\r\n${lines.join('\r\n')}`;
    },
    async delnote(args) {
      const fullInput = args.join(' ');
      let result;
      if (!fullInput) return 'Usage: delnotes <id> ';

      let text = fullInput;

      console.log(text)

      if (text.length) {
        result= await window.brainAPI.delNote(text);
      }
      return `${result.message}`;
    },
    async checkdb() {

      let result=window.brainAPI.checkDb();
      console.log(result);

      return `${result.message}`;
    },
    dropallnotes: async (confirmed = false) => {
      if (confirmed == false) {
        return "Operation failed.";
      }
      if (confirmed == true) {
        let result=  await window.brainAPI.dropDatabase();
        try {
          return `🗑️ ${result.message}`;
        } catch ($e) {
          return `db failed to drop, error:${$e},${result.message}`;
        }
      }
    },
    clear() { term.current.clear(); return ''; },
    cls() { term.current.clear(); return ''; },
    echo: args => args.join(' '),
    exit0(){
      window.brainAPI.close();
    },
    // pwd: () => currentDir.current,
    // cd: args => { if (args[0]) currentDir.current = args[0]; return ''; },
    help() {
      return [
        `${ANSI.bold}COMMANDS${ANSI.reset}`,
        `${ANSI.cyan}addnote <text> [--tag=tag1,tag2]${ANSI.reset}  - Save a note (auto-tagged or manual)`,
        `${ANSI.cyan}shownotes${ANSI.reset}                         - List all saved notes`,
        `${ANSI.cyan}filternotes <tag>${ANSI.reset}                 - List notes with a specific tag`,
        `${ANSI.cyan}showtags${ANSI.reset}                          - List all unique tags`,
        `${ANSI.cyan}delnote <id>${ANSI.reset}                      - Delete specific note by ID `,
        `${ANSI.cyan}dropallnotes${ANSI.reset}                      - Delete all notes and tags ${ANSI.red}(DANGER!)${ANSI.reset}`,
        `${ANSI.cyan}echo <text>${ANSI.reset}                       - Print text to terminal`,
        `${ANSI.cyan}clear / cls${ANSI.reset}                       - Clear the terminal screen`,
        `${ANSI.cyan}help${ANSI.reset}                              - Show this help menu`,
      ].join('\r\n');
    },
  };

  const getPrompt = () => {
    const now = new Date().toLocaleTimeString();
    return `${ANSI.bold}${ANSI.green}${USER}@${HOST}${ANSI.reset} ` +
      `${ANSI.cyan}${currentDir.current}${ANSI.reset} ` +
      `[${ANSI.cyan}${now}${ANSI.reset}] ${promptSymbol} `;
  };

  const highlight = text => {
    const words = text.split(/(\s+)/); // includes whitespace
    return words.map(word => {
      if (/^\s+$/.test(word)) return word; // preserve spaces

      if (COMMANDS.hasOwnProperty(word)) {
        return `${ANSI.bold}${ANSI.green}${word}${ANSI.reset}`;
      }

      if (/^['"].*['"]$/.test(word)) {
        return `${ANSI.green}${word}${ANSI.reset}`;
      }

      if (TAGS.some(tag => word.startsWith(tag))) {
        return `${ANSI.dim}${ANSI.white}${word}${ANSI.reset}`;
      }

      return word;
    }).join('');
  };



  const renderLine = () => {
    const promptText = isMultiline.current ? '... ' : getPrompt();
    term.current.write(`\r${' '.repeat(term.current.cols)}\r${promptText}${highlight(inputBuffer.current)}`);
  };

  const prompt = useCallback(() => {
    term.current.write(`\r\n${isMultiline.current ? '... ' : getPrompt()}`);
  }, []);

  const print = useCallback(text => {
    term.current.write(`\r\n${text}\r\n`);
  }, []);

  useImperativeHandle(ref, () => ({
    printToTerminal: print,
  }));

  const evaluateCommand = useCallback(async input => {
    const [cmd, ...args] = input.split(' ');
    if (COMMANDS[cmd]) return await COMMANDS[cmd](args);
    return `Unknown command: ${cmd}`;
  }, []);

  const handleData = useCallback(async data => {
    if (confirmation.current) {
      const answer = data.toLowerCase();
      const { command } = confirmation.current;

      if (answer === 'y') {
        const output = await COMMANDS[command](true); // No argument unless expected
        if (output) print(output);
      } else {
        print('❌ Operation cancelled.');
      }

      confirmation.current = null;
      inputBuffer.current = '';
      prompt();
      return;
    }


    const code = data.charCodeAt(0);
    // Ignore non-printable/control characters (Ctrl+C, etc.)
    if (code < 32 && ![13, 8].includes(code)) return;

    switch (data) {
      case KEYS.ENTER: {
        const isContinue = inputBuffer.current.trim().endsWith('\\');
        if (isContinue) {
          isMultiline.current = true;
          inputBuffer.current = inputBuffer.current.slice(0, -1) + '\n';
          term.current.write('\r\n... ');
        } else {
          const command = inputBuffer.current.trim();
          term.current.write('\r\n');
          if (command) {
            history.current.push(command);
            historyIndex.current = history.current.length;
            if (command === 'dropallnotes') {
              term.current.write('\n⚠️ Are you sure you want to delete all notes? (y/n):');
              confirmation.current = { command: 'dropallnotes' };
              inputBuffer.current = '';
              return;
            }
            const output = onCommand ? await onCommand(command) : await evaluateCommand(command);
            if (output) print(output);
          }
          inputBuffer.current = '';
          isMultiline.current = false;
          prompt();
        }
        break;
      }
      case KEYS.BACKSPACE:
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          renderLine();
        }
        break;
      case KEYS.UP:
        if (history.current.length && historyIndex.current > 0) {
          historyIndex.current--;
          inputBuffer.current = history.current[historyIndex.current];
          renderLine();
        }
        break;
      case KEYS.DOWN:
        if (historyIndex.current < history.current.length - 1) {
          historyIndex.current++;
          inputBuffer.current = history.current[historyIndex.current];
        } else {
          historyIndex.current = history.current.length;
          inputBuffer.current = '';
        }
        renderLine();
        break;
      default:
        inputBuffer.current += data;
        historyIndex.current = history.current.length;
        renderLine();
    }
  }, [onCommand, evaluateCommand]);

  useEffect(() => {
    term.current = new Terminal({
      cursorBlink: true,
      scrollback: 1000,
      fontSize: 13,
      fontFamily: 'Fira Code, monospace',
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#89dceb',
        selection: '#45475a',
      },
    });

    term.current.loadAddon(fitAddon.current);
    term.current.open(terminalRef.current);
    fitAddon.current.fit();

    term.current.writeln(`${ANSI.green}${ASCII_BANNER}${ANSI.reset}`);
    term.current.writeln(`${ANSI.green}(c) Purwao, All Rights Reserved.${ANSI.reset}`);
    term.current.writeln(`${ANSI.green}Second Brain Console ready.${ANSI.reset}`);
    term.current.writeln(`${ANSI.green}Type "help" to see available commands.${ANSI.reset}`);
    prompt();
    term.current.onData(handleData);

    const resizeObserver = new ResizeObserver(() => {
      if (terminalRef.current) fitAddon.current.fit();
    });
    resizeObserver.observe(terminalRef.current);

    setTimeout(() => term.current.focus(), 100);

    return () => {
      term.current?.dispose();
      resizeObserver.disconnect();
    };
  }, [handleData, prompt]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="terminal" ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

export default TerminalView;
