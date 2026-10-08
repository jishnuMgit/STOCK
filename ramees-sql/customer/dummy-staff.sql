INSERT INTO dbo.tblstaff (fcoid, fstaffid, fstaffname, fcuserid, fcuserdate)
VALUES
  -- company 01
  ('01', 'S001', 'Ahmed Khan',  'admin', NOW()),
  ('01', 'S002', 'Rahul Menon', 'admin', NOW()),
  ('01', 'S003', 'Fatima Noor', 'admin', NOW()),
  ('01', 'S004', 'John Mathew', 'admin', NOW()),
  ('01', 'S005', 'Sara Ali',    'admin', NOW()),
  -- company 02
  ('02', 'S101', 'Omar Hassan', 'admin', NOW()),
  ('02', 'S102', 'Priya Nair',  'admin', NOW()),
  ('02', 'S103', 'David Paul',  'admin', NOW());

COMMIT;