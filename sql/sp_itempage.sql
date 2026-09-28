CREATE OR REPLACE PROCEDURE dbo.sp_itempage(
    p_strmode              varchar(5),
    p_pstrcoid             varchar(3),
    p_stritemid            varchar(40),
    p_strbrid              varchar(3)   DEFAULT NULL,
    p_original_fbrid       varchar(3)   DEFAULT NULL,
    p_stritemname          varchar(100) DEFAULT NULL,
    p_stritemdescription   varchar(100) DEFAULT NULL,
    p_strunit              varchar(8)   DEFAULT NULL,
    p_numpacking           numeric(18,0) DEFAULT 0,
    p_numcbm               numeric(18,4) DEFAULT 0,
    p_stritemgroupid       varchar(8)   DEFAULT NULL,
    p_strsupplierid        varchar(12)  DEFAULT NULL,
    p_strsupplieritemid    varchar(40)  DEFAULT NULL,
    p_intreorderlevel      integer      DEFAULT 0,
    p_intreorderqty        integer      DEFAULT 0,
    p_stritemlocation      varchar(20)  DEFAULT NULL,
    p_blnallowsalebelowcost boolean     DEFAULT false,
    p_blninactive          boolean      DEFAULT false,
    p_pstruserid           varchar(30)  DEFAULT NULL,
    p_strmenuname          varchar(50)  DEFAULT NULL,
    p_strscreenname        varchar(50)  DEFAULT NULL,
    p_strmoduleid          varchar(4)   DEFAULT NULL,
    p_result_cursor        refcursor    DEFAULT 'cur_item'
)
LANGUAGE plpgsql
AS $$
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
$$;
