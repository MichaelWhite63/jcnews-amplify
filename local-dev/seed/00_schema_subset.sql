-- LOCAL TESTING ONLY. Subset of the production in4mdatabase schema needed by the
-- access-token code. Column names and types mirror production (MySQL 8.4, utf8mb4_0900_ai_ci,
-- verified via SHOW CREATE TABLE) and contain NO real data. Production has no UNIQUE key on
-- persons.email and no link_requested_at column; accessList is a column on persons, not a table.
CREATE DATABASE IF NOT EXISTS in4mdatabase;
USE in4mdatabase;

CREATE TABLE IF NOT EXISTS departments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(255) DEFAULT NULL,
  fkCompanyId      INT DEFAULT NULL,
  fkPersonId       INT DEFAULT NULL,
  finderPercentage INT DEFAULT NULL,
  finderCompany    VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS persons (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(40) DEFAULT NULL,
  token          VARCHAR(255) DEFAULT NULL COMMENT 'LEGACY base64(email) - unused by the new access code',
  firstName      VARCHAR(50) DEFAULT NULL,
  lastName       VARCHAR(50) DEFAULT NULL,
  fkDepartmentId INT DEFAULT NULL,
  fkCompanyId    INT DEFAULT NULL,
  createdAt      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  accessList     VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
