DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "categories"
    WHERE "status" = 'ACTIVE'
    GROUP BY "user_id", lower("name")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add active category name unique index while duplicate active category names exist';
  END IF;
END $$;

CREATE UNIQUE INDEX "categories_active_user_name_unique_idx"
ON "categories" ("user_id", lower("name"))
WHERE "status" = 'ACTIVE';
