/**
 * 配置工具模組
 * 
 * 負責處理環境變數和配置相關功能
 */

import { logger } from './logger';
import { CrawlerConfig } from '../types';

/**
 * 解析監理所列表字串
 * @returns 監理所資訊陣列
 */
export function parseDmvsList(): CrawlerConfig[] {
    try {
        const dmvsListStr = process.env.DMVS_LIST;
        
        if (!dmvsListStr) {
            logger.warn('環境變數 DMVS_LIST 未設定，將使用空陣列');
            return [];
        }
        
        // 以逗號分隔不同監理所
        return dmvsListStr.split(',')
            .map(item => {
                // 以豎線符號分隔每個監理所的資訊
                const [name, url, crawlerType] = item.split('|');
                
                if (!name || !url || !crawlerType) {
                    logger.warn(`監理所資訊格式不正確: ${item}`);
                    return null;
                }
                
                const type = crawlerType.trim().toLowerCase();
                if (type !== 'table' && type !== 'image') {
                    logger.warn(`未支援的爬蟲類型: ${type}，將跳過 ${name}`);
                    return null;
                }
                
                return {
                    name: name.trim(),
                    url: url.trim(),
                    crawlerType: type as 'table' | 'image'
                };
            })
            .filter((item): item is CrawlerConfig => item !== null); // 過濾掉無效的項目
    } catch (error: any) {
        logger.error(`解析監理所列表失敗: ${error.message}`);
        return [];
    }
}

/**
 * 系統配置介面
 */
export interface AppConfig {
    port: number;
    dbConfig: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        connectionLimit: number;
    };
    jwtSecret: string;
    rateLimit: number;
    logLevel: string;
    openaiApiKey: string;
    openaiModel: string;
    crawlerInterval: string;
    crawlerTimeout: number;
}

/**
 * 取得應用程式配置
 * @returns 應用程式配置物件
 */
export function getAppConfig(): AppConfig {
    return {
        port: parseInt(process.env.API_PORT || '3000'),
        dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'drunk_driving_registry',
            connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
        },
        jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
        rateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
        logLevel: process.env.LOG_LEVEL || 'info',
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        crawlerInterval: process.env.CRAWLER_INTERVAL || '0 0 * * *', // 每天午夜
        crawlerTimeout: parseInt(process.env.CRAWLER_TIMEOUT || '60000')
    };
}

/**
 * 資料庫配置介面
 */
export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
}

/**
 * 伺服器配置介面
 */
export interface ServerConfig {
    host: string;
    port: number;
}

/**
 * CORS 配置介面
 */
export interface CorsConfig {
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
}

/**
 * 系統配置物件
 * 包含所有在系統各處需要的配置
 */
export const config = {
    env: process.env.NODE_ENV || 'development',
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'drunk_driving_registry',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    },
    server: {
        host: process.env.API_HOST || '0.0.0.0',
        port: parseInt(process.env.API_PORT || '3000'),
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
        origins: (process.env.CORS_ORIGINS || '*').split(','),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    },
    crawler: {
        interval: process.env.CRAWLER_INTERVAL || '0 0 * * *', // 每天午夜
        timeout: parseInt(process.env.CRAWLER_TIMEOUT || '60000'),
    },
    rateLimit: {
        max: parseInt(process.env.API_RATE_LIMIT || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    },
};

// 將現有的 getAppConfig 保留做為向下兼容
// 新程式終究應使用 config 物件
