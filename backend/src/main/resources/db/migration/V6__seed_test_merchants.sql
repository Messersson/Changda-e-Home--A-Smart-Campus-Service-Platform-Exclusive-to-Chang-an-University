INSERT INTO users (student_id, email, password, name, major, grade, role, status)
VALUES
  ('merchant01@test.com', 'merchant01@test.com', 'merchant123', 'Merchant One', 'Snack Test Store', 'merchant', 'merchant', 'active'),
  ('merchant02@test.com', 'merchant02@test.com', 'merchant123', 'Merchant Two', 'Market Test Store', 'merchant', 'merchant', 'active'),
  ('merchant03@test.com', 'merchant03@test.com', 'merchant123', 'Merchant Three', 'Service Test Store', 'merchant', 'merchant', 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  major = VALUES(major),
  grade = VALUES(grade),
  role = VALUES(role),
  status = VALUES(status);

INSERT INTO merchant_applications (
  user_id, store_name, contact_name, phone, email, address, description,
  status, audit_remark, auditor_id, audited_at
)
SELECT
  u.id,
  seed.store_name,
  seed.contact_name,
  seed.phone,
  seed.email,
  seed.address,
  seed.description,
  'approved',
  'Seeded test merchant account',
  1,
  CURRENT_TIMESTAMP
FROM users u
INNER JOIN (
  SELECT 'merchant01@test.com' AS email, 'Snack Test Store' AS store_name, 'Merchant One' AS contact_name,
         '13800001001' AS phone, 'Campus East Gate Test Booth 01' AS address, 'Snack merchant test account' AS description
  UNION ALL
  SELECT 'merchant02@test.com', 'Market Test Store', 'Merchant Two',
         '13800001002', 'Campus Market Test Area 02', 'Supermarket merchant test account'
  UNION ALL
  SELECT 'merchant03@test.com', 'Service Test Store', 'Merchant Three',
         '13800001003', 'Student Service Center Booth 03', 'Service merchant test account'
) seed ON seed.email = u.email
ON DUPLICATE KEY UPDATE
  store_name = VALUES(store_name),
  contact_name = VALUES(contact_name),
  phone = VALUES(phone),
  email = VALUES(email),
  address = VALUES(address),
  description = VALUES(description),
  status = VALUES(status),
  audit_remark = VALUES(audit_remark),
  auditor_id = VALUES(auditor_id),
  audited_at = COALESCE(merchant_applications.audited_at, VALUES(audited_at));

INSERT INTO merchant_profiles (
  user_id, application_id, store_name, contact_name, phone, email, address,
  description, status, approved_at
)
SELECT
  u.id,
  ma.id,
  seed.store_name,
  seed.contact_name,
  seed.phone,
  seed.email,
  seed.address,
  seed.description,
  'active',
  CURRENT_TIMESTAMP
FROM users u
INNER JOIN merchant_applications ma ON ma.user_id = u.id
INNER JOIN (
  SELECT 'merchant01@test.com' AS email, 'Snack Test Store' AS store_name, 'Merchant One' AS contact_name,
         '13800001001' AS phone, 'Campus East Gate Test Booth 01' AS address, 'Snack merchant test account' AS description
  UNION ALL
  SELECT 'merchant02@test.com', 'Market Test Store', 'Merchant Two',
         '13800001002', 'Campus Market Test Area 02', 'Supermarket merchant test account'
  UNION ALL
  SELECT 'merchant03@test.com', 'Service Test Store', 'Merchant Three',
         '13800001003', 'Student Service Center Booth 03', 'Service merchant test account'
) seed ON seed.email = u.email
ON DUPLICATE KEY UPDATE
  application_id = VALUES(application_id),
  store_name = VALUES(store_name),
  contact_name = VALUES(contact_name),
  phone = VALUES(phone),
  email = VALUES(email),
  address = VALUES(address),
  description = VALUES(description),
  status = VALUES(status),
  approved_at = COALESCE(merchant_profiles.approved_at, VALUES(approved_at));
