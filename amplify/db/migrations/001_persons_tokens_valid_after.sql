-- Browser access (phase 1, stateless signed link tokens). Additive, nullable, no backfill.
-- No access_tokens table: link tokens are HMAC-signed (person id + UTC issue day + kid).
--   tokens_valid_after : link tokens whose issue day starts before this instant are rejected (revocation).
-- DATETIME values are UTC (the Lambdas connect with timezone 'Z').
-- Online on MySQL 8 (INSTANT for a trailing nullable column). persons.token (base64 email) is untouched.
ALTER TABLE persons
  ADD COLUMN tokens_valid_after DATETIME(3) NULL COMMENT 'reject link tokens issued before (UTC)';

-- Rollback:
-- ALTER TABLE persons DROP COLUMN tokens_valid_after;
