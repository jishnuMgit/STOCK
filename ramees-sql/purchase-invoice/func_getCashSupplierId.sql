CREATE OR REPLACE FUNCTION dbo.getcashsupplierid(p_coid varchar)
RETURNS varchar
LANGUAGE sql
STABLE
AS $$
  SELECT LPAD(
           (COALESCE(MAX("fCashSupplierID"::int), 0) + 1)::text,
           4, '0')
  FROM dbo."tblCashSupplier"
  WHERE "fCoID" = p_coid
    AND "fCashSupplierID" ~ '^[0-9]+$';
$$;