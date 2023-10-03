import pino from 'pino';

// create pino logger
const logger = pino({
  level: 'debug',
  base: null,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export default logger;
