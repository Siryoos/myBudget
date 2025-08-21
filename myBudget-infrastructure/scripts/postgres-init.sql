-- Create databases for services
CREATE DATABASE keycloak;
CREATE DATABASE postal;

-- Create users for services
CREATE USER keycloak WITH ENCRYPTED PASSWORD 'keycloak_password';
CREATE USER postal WITH ENCRYPTED PASSWORD 'postal_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
GRANT ALL PRIVILEGES ON DATABASE postal TO postal;

-- Create schema for myBudget application
CREATE SCHEMA IF NOT EXISTS mybudget;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";