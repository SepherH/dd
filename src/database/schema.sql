-- 酒駕累犯整合平台資料庫結構
-- 使用 MariaDB/MySQL 語法

-- 確保使用 UTF-8mb4 字元集，以支援完整 Unicode 字元（包括表情符號和多語系字符）
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;

-- 創建酒駕累犯主表
CREATE TABLE IF NOT EXISTS `offenders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '累犯姓名',
  `id_number` VARCHAR(20) COMMENT '身分證字號（如有）',
  `license_plate` VARCHAR(20) COMMENT '車牌號碼（如有）',
  `gender` ENUM('male', 'female') COMMENT '性別',
  `violation_date` DATE COMMENT '違規日期',
  `case_number` VARCHAR(50) COMMENT '裁決字號',
  `raw_data` TEXT COMMENT '原始資料（JSON 字串）',
  `source` VARCHAR(100) NOT NULL COMMENT '資料來源名稱',
  `source_url` VARCHAR(255) COMMENT '來源網址',
  `image_url` VARCHAR(255) COMMENT '圖片網址（如資料來自圖片）',
  `crawl_time` DATETIME NOT NULL COMMENT '爬取時間',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',

  -- 添加索引以提高查詢效能
  INDEX `idx_name` (`name`),
  INDEX `idx_id_number` (`id_number`),
  INDEX `idx_license_plate` (`license_plate`),
  INDEX `idx_violation_date` (`violation_date`),
  INDEX `idx_case_number` (`case_number`),
  INDEX `idx_source` (`source`),
  INDEX `idx_name_id` (`name`, `id_number`),
  INDEX `idx_name_license` (`name`, `license_plate`),
  
  -- 設定預設字元集和排序規則
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='酒駕累犯資料主表';

-- 酒駕累犯與資料來源的關聯表（提供更靈活的一對多關係）
CREATE TABLE IF NOT EXISTS `offender_sources` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `offender_id` INT UNSIGNED NOT NULL COMMENT '關聯的累犯 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '來源名稱，例如：臺北監理所',
  `url` VARCHAR(255) COMMENT '來源網址',
  `image_url` VARCHAR(255) COMMENT '圖片網址（如果資料來自圖片）',
  `crawl_time` DATETIME NOT NULL COMMENT '爬取時間',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',

  -- 外鍵關聯
  FOREIGN KEY (`offender_id`) REFERENCES `offenders`(`id`) ON DELETE CASCADE,
  
  -- 索引
  INDEX `idx_offender_id` (`offender_id`),
  INDEX `idx_name` (`name`),
  INDEX `idx_crawl_time` (`crawl_time`),
  
  -- 設定預設字元集和排序規則
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='酒駕累犯資料來源關聯表';

-- 日誌記錄表（可選）
CREATE TABLE IF NOT EXISTS `logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `level` VARCHAR(10) NOT NULL COMMENT '日誌等級（debug, info, warn, error）',
  `message` TEXT NOT NULL COMMENT '日誌訊息',
  `metadata` JSON COMMENT '額外的中繼資料',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '記錄時間',
  
  -- 索引
  INDEX `idx_level` (`level`),
  INDEX `idx_created_at` (`created_at`),
  
  -- 設定預設字元集和排序規則
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='系統日誌表';

-- API 金鑰表（可用於認證）
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(64) NOT NULL COMMENT 'API 金鑰值',
  `name` VARCHAR(100) NOT NULL COMMENT '金鑰名稱/用途',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  `expires_at` DATETIME COMMENT '過期時間（如有）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `last_used_at` TIMESTAMP NULL COMMENT '最後使用時間',
  
  -- 索引
  UNIQUE INDEX `idx_key` (`key`),
  INDEX `idx_is_active` (`is_active`),
  
  -- 設定預設字元集和排序規則
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='API 金鑰表';
