-- Fix client_type enum mismatch
-- This will reset the enum to match the current schema definition

BEGIN;

-- Step 1: Change column to text temporarily
ALTER TABLE clients ALTER COLUMN client_type TYPE text;

-- Step 2: Drop the old enum type
DROP TYPE IF EXISTS enum_clients_client_type CASCADE;

-- Step 3: Create the enum with current values
CREATE TYPE enum_clients_client_type AS ENUM ('retail', 'outsourcing-partner');

-- Step 4: Convert column back to enum
ALTER TABLE clients 
ALTER COLUMN client_type TYPE enum_clients_client_type 
USING client_type::enum_clients_client_type;

-- Step 5: Set default value
ALTER TABLE clients 
ALTER COLUMN client_type SET DEFAULT 'retail'::enum_clients_client_type;

COMMIT;
