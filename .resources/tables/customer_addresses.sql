CREATE TABLE `customer_addresses` (
    `customer_id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `address_type` ENUM('home','work','other') NOT NULL,
    `zipcode` VARCHAR(20) NOT NULL,

    PRIMARY KEY (
        `customer_id`,
        `company_id`,
        `address_type`
    ),

    CONSTRAINT `fk_customer_addresses_customer`
        FOREIGN KEY (
            `customer_id`,
            `company_id`
        )
        REFERENCES `customers` (
            `id`,
            `company_id`
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
);