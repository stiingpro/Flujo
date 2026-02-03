-- Function: delete_own_category
-- Description: Securely deletes a category by ID, strictly enforcing user ownership.
-- Returns: The number of rows deleted (0 or 1).

CREATE OR REPLACE FUNCTION delete_own_category(target_category_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/superuser), bypassing restrictive RLS of the caller
SET search_path = public -- Secure search path
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Perform the delete, strictly matching the user_id to auth.uid()
    DELETE FROM categories
    WHERE id = target_category_id
      AND user_id = auth.uid();
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;
