export const KEYS = {
  ENTER: '\r',
  BACKSPACE: '\u007F',
  ARROW_UP: '\u001b[A',
  ARROW_DOWN: '\u001b[B',
  CTRL_A: '\x01', // Move to beginning
  CTRL_U: '\x15', // Clear line
};

export const ANSI = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  reset: '\x1b[0m',
};

export const ASCII_BANNER = `
${' '.repeat(2)}______   ______   _________  
.' ____ \\ |_   _ \\ |  _   _  | 
| (___ \\_|  | |_) ||_/ | | \\_| 
 _.____\`.   |  __'.    | |     
| \\____) | _| |__) |  _| |_    
 \\______.'|_______/  |_____|   
`.replace(/\n/g, '\r\n');
