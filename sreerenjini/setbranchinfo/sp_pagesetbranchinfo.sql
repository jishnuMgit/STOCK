-- PROCEDURE: dbo.sp_pagesetbranchinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, boolean, character varying, refcursor)

-- DROP PROCEDURE IF EXISTS dbo.sp_pagesetbranchinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, boolean, character varying, refcursor);

CREATE OR REPLACE PROCEDURE dbo.sp_pagesetbranchinfo(
	IN p_strmode character varying,
	IN p_pstrcoid character varying,
	IN p_strbrid character varying,
	IN p_strbrname_ar character varying DEFAULT NULL::character varying,
	IN p_strbuildingno character varying DEFAULT NULL::character varying,
	IN p_strstreetname character varying DEFAULT NULL::character varying,
	IN p_strdistrict character varying DEFAULT NULL::character varying,
	IN p_strcity character varying DEFAULT NULL::character varying,
	IN p_strcountry character varying DEFAULT NULL::character varying,
	IN p_strpostalcode character varying DEFAULT NULL::character varying,
	IN p_stradditionalno character varying DEFAULT NULL::character varying,
	IN p_strcrno character varying DEFAULT NULL::character varying,
	IN p_strlicenseno character varying DEFAULT NULL::character varying,
	IN p_strlicensecategory character varying DEFAULT NULL::character varying,
	IN p_strbuildingno_ar character varying DEFAULT NULL::character varying,
	IN p_strstreetname_ar character varying DEFAULT NULL::character varying,
	IN p_strdistrict_ar character varying DEFAULT NULL::character varying,
	IN p_strcity_ar character varying DEFAULT NULL::character varying,
	IN p_strcountry_ar character varying DEFAULT NULL::character varying,
	IN p_strpostalcode_ar character varying DEFAULT NULL::character varying,
	IN p_stradditionalno_ar character varying DEFAULT NULL::character varying,
	IN p_strcrno_ar character varying DEFAULT NULL::character varying,
	IN p_strlicenseno_ar character varying DEFAULT NULL::character varying,
	IN p_strlicensecategory_ar character varying DEFAULT NULL::character varying,
	IN p_strbraddress1 character varying DEFAULT NULL::character varying,
	IN p_strbraddress2 character varying DEFAULT NULL::character varying,
	IN p_strbraddress3 character varying DEFAULT NULL::character varying,
	IN p_strbraddress4 character varying DEFAULT NULL::character varying,
	IN p_strbraddress1_ar character varying DEFAULT NULL::character varying,
	IN p_strbraddress2_ar character varying DEFAULT NULL::character varying,
	IN p_strbraddress3_ar character varying DEFAULT NULL::character varying,
	IN p_strbraddress4_ar character varying DEFAULT NULL::character varying,
	IN p_blnho boolean DEFAULT false,
	IN p_pstruserid character varying DEFAULT NULL::character varying,
	IN p_result_cursor refcursor DEFAULT 'cur_branchinfo'::refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
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
$BODY$;
ALTER PROCEDURE dbo.sp_pagesetbranchinfo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, boolean, character varying, refcursor)
    OWNER TO postgres;

