INSERT INTO dbo.tbldocumentno
SELECT (jsonb_populate_record(
          t,
          jsonb_build_object(
            'fdoctype', CASE t.fdoctype WHEN 'BR' THEN 'BP' ELSE 'CP' END
          )
        )).*
FROM dbo.tbldocumentno t
WHERE t.fdoctype IN ('BR','CR')
  AND t.fstartseqno = '000001';