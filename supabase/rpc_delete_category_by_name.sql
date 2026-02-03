-- Function: delete_category_by_name
-- Description: Deletes ALL categories with a matching name for the current user. 
-- This fixes issues where duplicates (phantom rows) persist because the client deleted the wrong ID.

CREATE OR REPLACE FUNCTION delete_category_by_name(category_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all categories matching the name (case-insensitive) for the authenticated user
    DELETE FROM categories
    WHERE name ILIKE category_name
      AND user_id = auth.uid();
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;
