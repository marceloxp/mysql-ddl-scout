CREATE TABLE `customers` (
    -- PK simples
    `id` CHAR(36) NOT NULL,

    /* dados básicos */
    `company_id` CHAR(36) NOT NULL,
    `external_id` VARCHAR(100) DEFAULT NULL,

    -- tamanhos
    `name` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(50) DEFAULT NULL,

    -- textos
    `notes` TEXT,
    `description` MEDIUMTEXT,
    `metadata` JSON,

    -- números
    `age` TINYINT UNSIGNED,
    `score` INT DEFAULT 0,
    `balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `rating` DOUBLE DEFAULT NULL,
    `percent_complete` FLOAT DEFAULT 0,

    -- datas
    `birth_date` DATE,
    `last_login_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- tempo
    `total_time` TIME DEFAULT NULL,

    -- boolean
    `active` TINYINT(1) NOT NULL DEFAULT 1,

    -- enum
    `status` ENUM(
        'pending',
        'active',
        'blocked',
        'deleted'
    ) NOT NULL DEFAULT 'pending',

    -- set
    `permissions` SET(
        'read',
        'write',
        'delete',
        'admin'
    ) DEFAULT NULL,

    -- generated column
    `full_name` VARCHAR(400)
        GENERATED ALWAYS AS (
            CONCAT(name, ' (', id, ')')
        ) STORED,

    -- palavra reservada
    `order` INT DEFAULT NULL,

    -- check
    CONSTRAINT `chk_age`
        CHECK (`age` IS NULL OR `age` >= 0),

    PRIMARY KEY (`id`),

    UNIQUE KEY `customers_external_unique`
        (`company_id`, `external_id`),

    UNIQUE KEY `customers_name_unique`
        (`company_id`, `name`),

    KEY `idx_customers_status`
        (`status`),

    KEY `idx_customers_created_status`
        (`created_at`, `status`),

    KEY `idx_customers_name_prefix`
        (`name`(20)),

    CONSTRAINT `customers_company_id_foreign`
        FOREIGN KEY (`company_id`)
        REFERENCES `companies` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
ROW_FORMAT = DYNAMIC;