-- Grant all privileges to the fleetuser on the fleetdb database.
-- This is necessary for Prisma to manage migrations and for the application to run correctly.
GRANT ALL PRIVILEGES ON `fleetdb`.* TO 'fleetuser'@'%';
FLUSH PRIVILEGES;
