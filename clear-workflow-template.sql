-- Clear invalid workflow template references from jobs 10 and 11
UPDATE jobs 
SET workflow_template_id = NULL 
WHERE id IN (10, 11);
