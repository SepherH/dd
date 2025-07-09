/**
 * 日誌工具模組
 * 
 * 提供統一的日誌記錄功能
 */

// 定義日誌等級
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

// 從環境變數取得日誌等級設定
const configuredLevelStr = (process.env.LOG_LEVEL || 'info').toLowerCase();
const logLevelMap: Record<string, LogLevel> = {
    'debug': LogLevel.DEBUG,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR
};

const currentLevel = logLevelMap[configuredLevelStr] !== undefined 
    ? logLevelMap[configuredLevelStr] 
    : LogLevel.INFO;

// 格式化日誌訊息
function formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

// 日誌工具物件
export const logger = {
    /**
     * 記錄除錯訊息
     * @param message 日誌訊息
     */
    debug(message: string): void {
        if (currentLevel <= LogLevel.DEBUG) {
            console.debug(formatMessage('debug', message));
        }
    },
    
    /**
     * 記錄一般資訊
     * @param message 日誌訊息
     */
    info(message: string): void {
        if (currentLevel <= LogLevel.INFO) {
            console.info(formatMessage('info', message));
        }
    },
    
    /**
     * 記錄警告訊息
     * @param message 日誌訊息
     */
    warn(message: string): void {
        if (currentLevel <= LogLevel.WARN) {
            console.warn(formatMessage('warn', message));
        }
    },
    
    /**
     * 記錄錯誤訊息
     * @param message 日誌訊息
     */
    error(message: string): void {
        if (currentLevel <= LogLevel.ERROR) {
            console.error(formatMessage('error', message));
        }
    }
};
