/**
 * 日誌工具模組
 * 
 * 提供統一的日誌記錄功能
 */

// 定義日誌等級
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 從環境變數取得日誌等級設定
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevel = LOG_LEVELS[configuredLevel] !== undefined ? LOG_LEVELS[configuredLevel] : LOG_LEVELS.info;

// 格式化日誌訊息
function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

// 日誌工具物件
export const logger = {
  /**
   * 記錄除錯訊息
   * @param {string} message 日誌訊息
   */
  debug(message) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message));
    }
  },
  
  /**
   * 記錄一般資訊
   * @param {string} message 日誌訊息
   */
  info(message) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatMessage('info', message));
    }
  },
  
  /**
   * 記錄警告訊息
   * @param {string} message 日誌訊息
   */
  warn(message) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message));
    }
  },
  
  /**
   * 記錄錯誤訊息
   * @param {string} message 日誌訊息
   */
  error(message) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatMessage('error', message));
    }
  }
};
