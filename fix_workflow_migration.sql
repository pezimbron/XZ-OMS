-- Migration to convert default_workflow from enum to integer relationship
-- This will clear existing workflow values (clients will need to reassign)

BEGIN;

-- Step 1: Drop the old enum column
ALTER TABLE clients DROP COLUMN IF EXISTS default_workflow_id;

-- Step 2: Drop the old enum type
DROP TYPE IF EXISTS enum_clients_default_workflow;

-- Step 3: Add new integer column for workflow template relationship
ALTER TABLE clients ADD COLUMN default_workflow_id INTEGER;

-- Step 4: Add foreign key constraint
ALTER TABLE clients 
ADD CONSTRAINT clients_default_workflow_id_workflow_templates_id_fk 
FOREIGN KEY (default_workflow_id) 
REFERENCES workflow_templates(id) 
ON DELETE SET NULL 
ON UPDATE NO ACTION;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS clients_default_workflow_id_idx ON clients(default_workflow_id);

COMMIT;
