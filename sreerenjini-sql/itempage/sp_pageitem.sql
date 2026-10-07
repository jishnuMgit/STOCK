-- PROCEDURE: dbo.sp_pageitem(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_stritemid character varying, IN p_strbrid character varying, IN p_original_fbrid character varying, IN p_stritemname character varying, IN p_stritemdescription character varying, IN p_strunit character varying, IN p_numpacking numeric, IN p_numcbm numeric, IN p_stritemgroupid character varying, IN p_strsupplierid character varying, IN p_strsupplieritemid character varying, IN p_intreorderlevel integer, IN p_intreorderqty integer, IN p_stritemlocation character varying, IN p_blnallowsalebelowcost boolean, IN p_blninactive boolean, IN p_pstruserid character varying, IN p_strmenuname character varying, IN p_strscreenname character varying, IN p_strmoduleid character varying, IN p_result_cursor refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pageitem(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_stritemid character varying, IN p_strbrid character varying, IN p_original_fbrid character varying, IN p_stritemname character varying, IN p_stritemdescription character varying, IN p_strunit character varying, IN p_numpacking numeric, IN p_numcbm numeric, IN p_stritemgroupid character varying, IN p_strsupplierid character varying, IN p_strsupplieritemid character varying, IN p_intreorderlevel integer, IN p_intreorderqty integer, IN p_stritemlocation character varying, IN p_blnallowsalebelowcost boolean, IN p_blninactive boolean, IN p_pstruserid character varying, IN p_strmenuname character varying, IN p_strscreenname character varying, IN p_strmoduleid character varying, IN p_result_cursor refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pageitem(IN p_strmode character varying, IN p_pstrcoid character varying, IN p_stritemid character varying, IN p_strbrid character varying DEFAULT NULL::character varying, IN p_original_fbrid character varying DEFAULT NULL::character varying, IN p_stritemname character varying DEFAULT NULL::character varying, IN p_stritemdescription character varying DEFAULT NULL::character varying, IN p_strunit character varying DEFAULT NULL::character varying, IN p_numpacking numeric DEFAULT 0, IN p_numcbm numeric DEFAULT 0, IN p_stritemgroupid character varying DEFAULT NULL::character varying, IN p_strsupplierid character varying DEFAULT NULL::character varying, IN p_strsupplieritemid character varying DEFAULT NULL::character varying, IN p_intreorderlevel integer DEFAULT 0, IN p_intreorderqty integer DEFAULT 0, IN p_stritemlocation character varying DEFAULT NULL::character varying, IN p_blnallowsalebelowcost boolean DEFAULT false, IN p_blninactive boolean DEFAULT false, IN p_pstruserid character varying DEFAULT NULL::character varying, IN p_strmenuname character varying DEFAULT NULL::character varying, IN p_strscreenname character varying DEFAULT NULL::character varying, IN p_strmoduleid character varying DEFAULT NULL::character varying, IN p_result_cursor refcursor DEFAULT 'cur_item'::refcursor)
 LANGUAGE plpgsql
AS $procedure$
BEGIN

    IF p_strmode = 'GHD' THEN

        OPEN p_result_cursor FOR
            SELECT
                fcoid, fitemid, fitemname, fitemdescription, funit,
                fpacking, fcbm, fitemgroupid, fsupplierid, fsupplieritemid,
                freorderlevel, freorderqty
            FROM dbo.tblitemhd
            WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid;

    ELSIF p_strmode = 'GTL' THEN

        OPEN p_result_cursor FOR
            SELECT fbrid, fitemlocation, fallowsalebelowcost, finactive
            FROM dbo.tblitemtl
            WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid;

    ELSIF p_strmode = 'SHD' THEN

        INSERT INTO dbo.tblitemhd (
            fcoid, fitemid, fitemname, fitemdescription, funit,
            fpacking, fcbm, fitemgroupid, fsupplierid, fsupplieritemid,
            freorderlevel, freorderqty, fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_stritemid, p_stritemname, p_stritemdescription, p_strunit,
            p_numpacking, p_numcbm, p_stritemgroupid, p_strsupplierid, p_strsupplieritemid,
            p_intreorderlevel, p_intreorderqty, p_pstruserid, now()
        );

    ELSIF p_strmode = 'MHD' THEN

        UPDATE dbo.tblitemhd SET
            fitemname        = p_stritemname,
            fitemdescription = p_stritemdescription,
            funit            = p_strunit,
            fpacking         = p_numpacking,
            fcbm             = p_numcbm,
            fitemgroupid     = p_stritemgroupid,
            fsupplierid      = p_strsupplierid,
            fsupplieritemid  = p_strsupplieritemid,
            freorderlevel    = p_intreorderlevel,
            freorderqty      = p_intreorderqty,
            fmuserid         = p_pstruserid,
            fmuserdate       = now()
        WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid;

    ELSIF p_strmode = 'STL' THEN

        INSERT INTO dbo.tblitemtl (
            fcoid, fbrid, fitemid, fitemlocation,
            finactive, fallowsalebelowcost, fcuserid, fcuserdate
        )
        VALUES (
            p_pstrcoid, p_strbrid, p_stritemid, p_stritemlocation,
            COALESCE(p_blninactive, false), COALESCE(p_blnallowsalebelowcost, false),
            p_pstruserid, now()
        );

    ELSIF p_strmode = 'MTL' THEN

        UPDATE dbo.tblitemtl SET
            fbrid               = p_strbrid,
            fitemlocation       = p_stritemlocation,
            fallowsalebelowcost = COALESCE(p_blnallowsalebelowcost, false),
            finactive           = COALESCE(p_blninactive, false),
            fmuserid            = p_pstruserid,
            fmuserdate          = now()
        WHERE fcoid = p_pstrcoid AND fbrid = p_original_fbrid AND fitemid = p_stritemid;

    ELSIF p_strmode = 'D' THEN

        DELETE FROM dbo.tblitemhd WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid;
        DELETE FROM dbo.tblitemtl WHERE fcoid = p_pstrcoid AND fitemid = p_stritemid;

    ELSIF p_strmode = 'D1' THEN

        DELETE FROM dbo.tblitemtl
        WHERE fcoid = p_pstrcoid AND fbrid = p_strbrid AND fitemid = p_stritemid;

    END IF;

END;
$procedure$;
