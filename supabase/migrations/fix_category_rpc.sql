-- Function to delete category by name and type for the authenticated user
CREATE OR REPLACE FUNCTION delete_category_by_name(category_name text, category_type text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete categories matching name, type and user_id
  -- Transactions will be deleted automatically due to CASCADE on foreign key if configured,
  -- otherwise we might need to delete them manually. 
  -- The schema shows: user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
  -- BUT transaction.category_id reference?
  -- Validating schema.sql: "category_id TEXT" - No foreign key constraint is visible in the provided schema snippet for category_id! 
  -- "category_id TEXT" ... wait. 
  -- Creating the constraint might be safer, or manually deleting transactions.
  
  -- First, delete transactions associated with these categories
  DELETE FROM transactions
  WHERE category_id IN (
    SELECT id FROM categories 
    WHERE name = category_name 
    AND type = category_type
    AND user_id = auth.uid()
  );

  -- Then delete the categories
  WITH deleted_rows AS (
    DELETE FROM categories
    WHERE name = category_name 
    AND type = category_type
    AND user_id = auth.uid()
    RETURNING *
  )
  SELECT count(*) INTO deleted_count FROM deleted_rows;
  
  RETURN deleted_count;
END;
$$;

-- Function to rename category by name and type
CREATE OR REPLACE FUNCTION rename_category(old_name text, new_name text, category_type text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count int;
BEGIN
  WITH updated_rows AS (
    UPDATE categories
    SET name = new_name
    WHERE name = old_name
    AND type = category_type
    AND user_id = auth.uid()
    RETURNING *
  )
  SELECT count(*) INTO updated_count FROM updated_rows;

  -- Also update transaction descriptions if they match the category name?
  -- Usually descriptions are independent, but sometimes they mirror the category.
  -- Let's stick to just renaming the category entity.
  
  RETURN updated_count;
END;
$$;
