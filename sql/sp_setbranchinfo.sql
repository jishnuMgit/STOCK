CREATE OR REPLACE PROCEDURE dbo.sp_setbranchinfo(
    p_strmode              varchar(1),
    p_pstrcoid             varchar(3),
    p_strbrid              varchar(3),
    p_strbrname_ar         varchar(40)  DEFAULT NULL,
    p_strbuildingno        varchar(4)   DEFAULT NULL,
    p_strstreetname        varchar(30)  DEFAULT NULL,
    p_strdistrict          varchar(30)  DEFAULT NULL,
    p_strcity              varchar(30)  DEFAULT NULL,
    p_strcountry           varchar(30)  DEFAULT NULL,
    p_strpostalcode        varchar(5)   DEFAULT NULL,
    p_stradditionalno      varchar(4)   DEFAULT NULL,
    p_strcrno              varchar(20)  DEFAULT NULL,
    p_strlicenseno         varchar(15)  DEFAULT NULL,
    p_strlicensecategory   varchar(60)  DEFAULT NULL,
    p_strbuildingno_ar     varchar(4)   DEFAULT NULL,
    p_strstreetname_ar     varchar(30)  DEFAULT NULL,
    p_strdistrict_ar       varchar(30)  DEFAULT NULL,
    p_strcity_ar           varchar(30)  DEFAULT NULL,
    p_strcountry_ar        varchar(30)  DEFAULT NULL,
    p_strpostalcode_ar     varchar(5)   DEFAULT NULL,
    p_stradditionalno_ar   varchar(4)   DEFAULT NULL,
    p_strcrno_ar           varchar(20)  DEFAULT NULL,
    p_strlicenseno_ar      varchar(15)  DEFAULT NULL,
    p_strlicensecategory_ar varchar(60) DEFAULT NULL,
    p_strbraddress1        varchar(80)  DEFAULT NULL,
    p_strbraddress2        varchar(80)  DEFAULT NULL,
    p_strbraddress3        varchar(80)  DEFAULT NULL,
    p_strbraddress4        varchar(80)  DEFAULT NULL,
    p_strbraddress1_ar     varchar(80)  DEFAULT NULL,
    p_strbraddress2_ar     varchar(80)  DEFAULT NULL,
    p_strbraddress3_ar     varchar(80)  DEFAULT NULL,
    p_strbraddress4_ar     varchar(80)  DEFAULT NULL,
    p_blnho                boolean      DEFAULT false,
    p_pstruserid           varchar(30)  DEFAULT NULL,
    p_result_cursor        refcursor    DEFAULT 'cur_branchinfo'
)
LANGUAGE plpgsql
AS $$
BEGIN

    IF p_strmode = 'G' THEN

        OPEN p_result_cursor FOR
            SELECT
                fbrname_ar, fbuildingno, fstreetname, fdistrict, fcity, fcountry,
                fpostalcode, fadditionalno, fcrno,
                fbuildingno_ar, fstreetname_ar, fdistrict_ar, fcity_ar, fcountry_ar,
                fpostalcode_ar, fadditionalno_ar, fcrno_ar,
                flicenseno, flicenseno_ar, flicensecategory, flicensecategory_ar, fho,
                fbraddress1, fbraddress2, fbraddress3, fbraddress4,
                fbraddress1_ar, fbraddress2_ar, fbraddress3_ar, fbraddress4_ar
            FROM dbo.tblbranch
            WHERE fcoid = p_pstrcoid AND fbrid = p_strbrid;

    ELSIF p_strmode = 'M' THEN

        UPDATE dbo.tblbranch SET
            fbrname_ar          = p_strbrname_ar,
            fbuildingno         = p_strbuildingno,
            fstreetname         = p_strstreetname,
            fdistrict           = p_strdistrict,
            fcity               = p_strcity,
            fcountry            = p_strcountry,
            fpostalcode         = p_strpostalcode,
            fadditionalno       = p_stradditionalno,
            fcrno               = p_strcrno,
            fbuildingno_ar      = p_strbuildingno_ar,
            fstreetname_ar      = p_strstreetname_ar,
            fdistrict_ar        = p_strdistrict_ar,
            fcity_ar            = p_strcity_ar,
            fcountry_ar         = p_strcountry_ar,
            fpostalcode_ar      = p_strpostalcode_ar,
            fadditionalno_ar    = p_stradditionalno_ar,
            fcrno_ar            = p_strcrno_ar,
            flicenseno          = p_strlicenseno,
            flicenseno_ar       = p_strlicenseno_ar,
            flicensecategory    = p_strlicensecategory,
            flicensecategory_ar = p_strlicensecategory_ar,
            fbraddress1         = p_strbraddress1,
            fbraddress2         = p_strbraddress2,
            fbraddress3         = p_strbraddress3,
            fbraddress4         = p_strbraddress4,
            fbraddress1_ar      = p_strbraddress1_ar,
            fbraddress2_ar      = p_strbraddress2_ar,
            fbraddress3_ar      = p_strbraddress3_ar,
            fbraddress4_ar      = p_strbraddress4_ar,
            fho                 = COALESCE(p_blnho, false),
            fmuserid            = p_pstruserid,
            fmuserdate          = now()
        WHERE fcoid = p_pstrcoid AND fbrid = p_strbrid;

    END IF;

END;
$$;
