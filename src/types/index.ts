/**
 * 專案全域型別定義
 */

// 酒駚累犯基本資料結構
export interface OffenderRecord {
    id?: number;
    name: string;
    idNumber?: string;
    licensePlate?: string;
    gender?: 'male' | 'female' | null;
    violationDate?: Date | string | null;
    caseNumber?: string;
    rawData?: string;
    source?: string;
    sourceUrl?: string;
    imageUrl?: string;
    crawlTime?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

// 資料來源結構
export interface SourceInfo {
    id?: number;
    offenderId: number;
    name: string;
    url?: string;
    imageUrl?: string;
    crawlTime: Date;
    createdAt?: Date;
}

// 爬蟲設定
export interface CrawlerConfig {
    name: string;
    url: string;
    crawlerType: 'table' | 'image';
}

// 分頁回應格式
export interface PaginationResponse<T> {
    status: 'success' | 'error';
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
