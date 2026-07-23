-- ========================================================
-- Migration: Add accessories and plants categories
-- ========================================================

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the check constraint on products table that references categories
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'products'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%category%';

    -- Drop the old constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE products DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Add the updated constraint including 'accessories' and 'plants'
ALTER TABLE products ADD CONSTRAINT products_category_check
    CHECK (category IN ('bouquets', 'preserved', 'vases', 'chocolates', 'custom', 'accessories', 'plants'));
