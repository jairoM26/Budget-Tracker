-- Runs once when the PostgreSQL container is first created.
-- Creates the test database alongside the default dev database.
-- budget_dev is already created by POSTGRES_DB in docker-compose.yml.

CREATE DATABASE budget_test
    WITH OWNER = budget
    ENCODING = 'UTF8';

GRANT ALL PRIVILEGES ON DATABASE budget_test TO budget;
