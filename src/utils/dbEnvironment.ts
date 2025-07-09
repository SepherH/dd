/**
 * 資料庫環境檢測工具
 * 
 * 根據當前環境自動選擇適合的資料庫連線設定
 */

import { logger } from './logger';
import os from 'os';

/**
 * 檢查是否在內部網路環境
 * 
 * @returns 是否在內部網路環境
 */
export function isInternalNetwork(): boolean {
    // 首先檢查環境變數設定
    if (process.env.NETWORK_ENV === 'home' || process.env.DB_USE_INTERNAL === 'true') {
        logger.debug('透過環境變數判定為內部網路環境');
        return true;
    }
    
    // 檢查網路介面是否有內部 IP
    try {
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            if (interfaces) {
                for (const iface of interfaces) {
                    // 如果 IP 以 192.168 開頭，視為內部網路
                    if (!iface.internal && iface.family === 'IPv4' && iface.address.startsWith('192.168')) {
                        logger.debug(`透過網路介面檢測到內部網路: ${iface.address}`);
                        return true;
                    }
                }
            }
        }
    } catch (error) {
        logger.error(`檢查網路介面時發生錯誤: ${error}`);
    }
    
    return false;
}

/**
 * 獲取適合當前環境的資料庫連線配置
 */
export function getDatabaseConfig() {
    const useInternalConnection = isInternalNetwork();
    
    const host = useInternalConnection 
        ? (process.env.DB_INTERNAL_HOST || '192.168.50.80') 
        : (process.env.DB_HOST || '59.126.99.232');
    
    logger.info(`使用${useInternalConnection ? '內部' : '外部'}資料庫連線: ${host}`);
    
    return {
        host,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'sepher',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'drunk_driving',
    };
}
