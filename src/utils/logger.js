// Códigos de color ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

const logger = {
  info: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${colors.blue}${colors.bright}[INFO]${colors.reset} ${colors.gray}${new Date().toISOString()}${colors.reset} - ${colors.cyan}${message}${colors.reset}`,
        Object.keys(data).length > 0 ? data : ''
      );
    }
  },

  error: (message, error = {}) => {
    console.error(
      `${colors.red}${colors.bright}[ERROR]${colors.reset} ${colors.gray}${new Date().toISOString()}${colors.reset} - ${colors.red}${message}${colors.reset}`,
      error
    );
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${colors.magenta}[DEBUG]${colors.reset} ${colors.gray}${new Date().toISOString()}${colors.reset} - ${colors.magenta}${message}${colors.reset}`,
        Object.keys(data).length > 0 ? data : ''
      );
    }
  },

  warn: (message, data = {}) => {
    console.warn(
      `${colors.yellow}${colors.bright}[WARN]${colors.reset} ${colors.gray}${new Date().toISOString()}${colors.reset} - ${colors.yellow}${message}${colors.reset}`,
      Object.keys(data).length > 0 ? data : ''
    );
  },

  node: (nodeName, action, data = {}) => {
    console.log(
      `\n${colors.bgBlue}${colors.white}${colors.bright}=== NODO: ${nodeName} - ${action} ===${colors.reset}`
    );
    if (Object.keys(data).length > 0) {
      console.log(`${colors.green}Estado:${colors.reset}`, data);
    }
  }
};

export default logger;