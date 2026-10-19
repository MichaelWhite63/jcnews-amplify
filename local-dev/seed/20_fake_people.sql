-- LOCAL TESTING ONLY: fake people (example.com addresses, RFC 2606 reserved domain).
USE in4mdatabase;
INSERT INTO departments (id, name) VALUES (1, 'Equities'), (2, 'Options Desk')
  ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO persons (id, email, token, firstName, lastName, fkDepartmentId, fkCompanyId, accessList) VALUES
 (1001, 'alice.equity@example.com',  TO_BASE64('alice.equity@example.com'),  'Alice', 'Equity',  1, NULL,
   '[{"Source":"Unlicensed","Permission":true},{"Source":"DowJones","Permission":true}]'),
 (1002, 'oscar.options@example.com', TO_BASE64('oscar.options@example.com'), 'Oscar', 'Options', 2, NULL,
   '[{"Source":"Unlicensed","Permission":true},{"Source":"DowJones","Permission":false}]'),
 (1003, 'nora.nosources@example.com', TO_BASE64('nora.nosources@example.com'), 'Nora', 'None',  1, NULL, '[]')
ON DUPLICATE KEY UPDATE email = VALUES(email);
