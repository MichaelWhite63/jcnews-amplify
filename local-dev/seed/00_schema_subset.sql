-- LOCAL TESTING ONLY. Minimal subset of the production in4mdatabase schema needed by the
-- access-token code. Column names match what the Amplify Lambdas query; types are guesses
-- (production `SHOW CREATE TABLE persons` could not be read) and contain NO real data.
CREATE DATABASE IF NOT EXISTS in4mdatabase;
USE in4mdatabase;

CREATE TABLE IF NOT EXISTS departments (
  id   INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS persons (
  id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(255) NOT NULL,
  token          VARCHAR(512) NULL COMMENT 'LEGACY base64(email) - unused by the new access code',
  firstName      VARCHAR(100) NULL,
  lastName       VARCHAR(100) NULL,
  fkDepartmentId INT NULL,
  fkCompanyId    INT NULL,
  accessList     TEXT NULL,
  UNIQUE KEY uq_persons_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
