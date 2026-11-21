CREATE OR REPLACE PROCEDURE dbo.sp_pagesupplier(
	IN p_strmode character varying,
	IN p_strcoid character varying,
	IN p_gstruserid character varying DEFAULT NULL::character varying,
	IN p_strcsaccountid character varying DEFAULT NULL::character varying,
	IN p_stroldcsaccountid character varying DEFAULT NULL::character varying,
	IN p_strgaccountid character varying DEFAULT NULL::character varying,
	IN p_strcsaccounttype character varying DEFAULT NULL::character varying,
	IN p_strcsaccounttypedet character varying DEFAULT NULL::character varying,
	IN p_straccountname character varying DEFAULT NULL::character varying,
	IN p_straccountname_a character varying DEFAULT NULL::character varying,
	IN p_strlegalname character varying DEFAULT NULL::character varying,
	IN p_strlegalname_a character varying DEFAULT NULL::character varying,
	IN p_strshortname character varying DEFAULT NULL::character varying,
	IN p_strbusinesstypeid character varying DEFAULT NULL::character varying,
	IN p_strbuildingno character varying DEFAULT NULL::character varying,
	IN p_strstreetname character varying DEFAULT NULL::character varying,
	IN p_strdistrict character varying DEFAULT NULL::character varying,
	IN p_strcity character varying DEFAULT NULL::character varying,
	IN p_strcountryid character varying DEFAULT NULL::character varying,
	IN p_strpostalcode character varying DEFAULT NULL::character varying,
	IN p_stradditionalno character varying DEFAULT NULL::character varying,
	IN p_strcrno character varying DEFAULT NULL::character varying,
	IN p_strvatno character varying DEFAULT NULL::character varying,
	IN p_strbuildingno_a character varying DEFAULT NULL::character varying,
	IN p_strstreetname_a character varying DEFAULT NULL::character varying,
	IN p_strdistrict_a character varying DEFAULT NULL::character varying,
	IN p_strcity_a character varying DEFAULT NULL::character varying,
	IN p_strcountryid_a character varying DEFAULT NULL::character varying,
	IN p_strpostalcode_a character varying DEFAULT NULL::character varying,
	IN p_stradditionalno_a character varying DEFAULT NULL::character varying,
	IN p_strcrno_a character varying DEFAULT NULL::character varying,
	IN p_strvatno_a character varying DEFAULT NULL::character varying,
	IN p_strcontact character varying DEFAULT NULL::character varying,
	IN p_stremail character varying DEFAULT NULL::character varying,
	IN p_strphone character varying DEFAULT NULL::character varying,
	IN p_strbrid character varying DEFAULT NULL::character varying,
	IN p_intcreditlimit integer DEFAULT 0,
	IN p_intcreditdays integer DEFAULT 0,
	IN p_blnhavedivision boolean DEFAULT false,
	IN p_blnstatus boolean DEFAULT false,
	IN p_blnintercompany boolean DEFAULT false,
	IN p_blnexclfromageing boolean DEFAULT false,
	IN p_strctacardtype character varying DEFAULT NULL::character varying,
	IN p_strctacardno character varying DEFAULT NULL::character varying,
	IN p_strctaexpiry character varying DEFAULT NULL::character varying,
	IN p_strtranstype character varying DEFAULT NULL::character varying,
	IN p_strinvmethod character varying DEFAULT NULL::character varying,
	IN p_strrcnmethod character varying DEFAULT NULL::character varying,
	IN p_strgdscustomerid character varying DEFAULT NULL::character varying,
	IN p_blncalcvatondomcanxchg boolean DEFAULT NULL::boolean,
	IN p_blnservicechargepolicy boolean DEFAULT NULL::boolean,
	IN p_strcsaccountcategoryid character varying DEFAULT NULL::character varying,
	IN p_blndonotround boolean DEFAULT NULL::boolean,
	IN p_strmenuname character varying DEFAULT NULL::character varying,
	IN p_strstaffid character varying DEFAULT NULL::character varying)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_old varchar(12);
BEGIN
    IF upper(p_strmode) = 'S' THEN
        IF EXISTS (SELECT 1 FROM dbo.tblaccountcs WHERE fcoid = p_strcoid AND fcsaccountid = p_strcsaccountid)
           OR EXISTS (SELECT 1 FROM dbo.tblaccount WHERE fcoid = p_strcoid AND faccountid = p_strcsaccountid)
        THEN
            RAISE EXCEPTION 'Supplier account % already exists', p_strcsaccountid USING ERRCODE = '23505';
        END IF;

        INSERT INTO dbo.tblaccountcs(
            fcoid, fcsaccountid, fcsaccountname, fcs, fcsdet,
            fcsaccountname_leagal, fcsaccountname_short, fgaccountid, fbussinesstype,
            fbuildingno, fstreetname, fdistrict, fcity, fcountryid, fpostalcode,
            fadditionalno, fcrno, fvatno,
            faccountname_ar, fleagalaccountname_ar, fbuildingno_ar, fstreetname_ar,
            fdistrict_ar, fcity_ar, fcountryid_ar, fpostalcode_ar, fadditionalno_ar,
            fcrno_ar, fvatno_ar, fcontact, fphone, femail, fhavedivision, fbrid,
            fcreditlimit, fcreditdays, fstatus, fintercompany, fexcludefromageing,
            fctacardtype, fctacardno, fctaexpiry, fstaffid, fcuserid, fcuserdate)
        VALUES(
            p_strcoid, p_strcsaccountid, p_straccountname,
            COALESCE(p_strcsaccounttype,'S'), COALESCE(p_strcsaccounttypedet,'100'),
            p_strlegalname, p_strshortname, p_strgaccountid, p_strbusinesstypeid,
            p_strbuildingno, p_strstreetname, p_strdistrict, p_strcity, p_strcountryid,
            p_strpostalcode, p_stradditionalno, p_strcrno, p_strvatno,
            p_straccountname_a, p_strlegalname_a, p_strbuildingno_a, p_strstreetname_a,
            p_strdistrict_a, p_strcity_a, p_strcountryid_a, p_strpostalcode_a,
            p_stradditionalno_a, p_strcrno_a, p_strvatno_a,
            p_strcontact, p_strphone, p_stremail, COALESCE(p_blnhavedivision,false), p_strbrid,
            COALESCE(p_intcreditlimit,0), COALESCE(p_intcreditdays,0),
            COALESCE(p_blnstatus,false), COALESCE(p_blnintercompany,false),
            COALESCE(p_blnexclfromageing,false),
            p_strctacardtype, p_strctacardno, p_strctaexpiry, p_strstaffid, p_gstruserid, CURRENT_TIMESTAMP);

        INSERT INTO dbo.tblaccount(
            fcoid, faccountid, fgph, fgcs, faccountname, faccountname_ar,
            facccountname_short, faccountgroupid, faccounttypeid, faccountlevel,
            fhavedivision, fhavecc, fstatus, fcuserid, fcuserdate)
        VALUES(
            p_strcoid, p_strcsaccountid, 'H', COALESCE(p_strcsaccounttype,'S'),
            p_straccountname, p_straccountname_a, p_strshortname, p_strgaccountid,
            dbo.getaccounttypeid(p_strcoid, p_strgaccountid), 4,
            COALESCE(p_blnhavedivision,false), false, COALESCE(p_blnstatus,false),
            p_gstruserid, CURRENT_TIMESTAMP);
        RETURN;
    END IF;

    IF upper(p_strmode) = 'M' THEN
        v_old := COALESCE(NULLIF(p_stroldcsaccountid,''), p_strcsaccountid);

        IF NOT EXISTS (SELECT 1 FROM dbo.tblaccountcs WHERE fcoid = p_strcoid AND fcsaccountid = v_old AND fcs = 'S') THEN
            RAISE EXCEPTION 'Supplier account % does not exist', v_old;
        END IF;

        IF v_old <> p_strcsaccountid AND (
              EXISTS (SELECT 1 FROM dbo.tblaccountcs WHERE fcoid = p_strcoid AND fcsaccountid = p_strcsaccountid)
           OR EXISTS (SELECT 1 FROM dbo.tblaccount WHERE fcoid = p_strcoid AND faccountid = p_strcsaccountid))
        THEN
            RAISE EXCEPTION 'Supplier account % already exists', p_strcsaccountid USING ERRCODE = '23505';
        END IF;

        UPDATE dbo.tblaccountcs SET
            fcsaccountid = p_strcsaccountid,
            fcsaccountname = p_straccountname,
            fcs = COALESCE(p_strcsaccounttype, fcs),
            fcsdet = COALESCE(p_strcsaccounttypedet, fcsdet),
            fcsaccountname_leagal = p_strlegalname,
            fcsaccountname_short = p_strshortname,
            fgaccountid = p_strgaccountid,
            fbussinesstype = p_strbusinesstypeid,
            fbuildingno = p_strbuildingno, fstreetname = p_strstreetname,
            fdistrict = p_strdistrict, fcity = p_strcity, fcountryid = p_strcountryid,
            fpostalcode = p_strpostalcode, fadditionalno = p_stradditionalno,
            fcrno = p_strcrno, fvatno = p_strvatno,
            faccountname_ar = p_straccountname_a, fleagalaccountname_ar = p_strlegalname_a,
            fbuildingno_ar = p_strbuildingno_a, fstreetname_ar = p_strstreetname_a,
            fdistrict_ar = p_strdistrict_a, fcity_ar = p_strcity_a,
            fcountryid_ar = p_strcountryid_a, fpostalcode_ar = p_strpostalcode_a,
            fadditionalno_ar = p_stradditionalno_a, fcrno_ar = p_strcrno_a,
            fvatno_ar = p_strvatno_a,
            fcontact = p_strcontact, fphone = p_strphone, femail = p_stremail,
            fhavedivision = COALESCE(p_blnhavedivision,false),
            fbrid = COALESCE(p_strbrid, fbrid),
            fcreditlimit = COALESCE(p_intcreditlimit,0),
            fcreditdays = COALESCE(p_intcreditdays,0),
            fstatus = COALESCE(p_blnstatus,false),
            fintercompany = COALESCE(p_blnintercompany,false),
            fexcludefromageing = COALESCE(p_blnexclfromageing,false),
            fctacardtype = COALESCE(p_strctacardtype, fctacardtype),
            fctacardno = COALESCE(p_strctacardno, fctacardno),
            fctaexpiry = COALESCE(p_strctaexpiry, fctaexpiry),
            fstaffid = p_strstaffid,
            fmuserid = p_gstruserid, fmuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_strcoid AND fcsaccountid = v_old AND fcs = 'S';

        UPDATE dbo.tblaccount SET
            faccountid = p_strcsaccountid,
            faccountname = p_straccountname,
            faccountname_ar = p_straccountname_a,
            facccountname_short = p_strshortname,
            faccountgroupid = p_strgaccountid,
            fhavedivision = COALESCE(p_blnhavedivision,false),
            fstatus = COALESCE(p_blnstatus,false),
            fmuserid = p_gstruserid, fmuserdate = CURRENT_TIMESTAMP
        WHERE fcoid = p_strcoid AND faccountid = v_old AND fgcs = 'S';
        RETURN;
    END IF;

    IF upper(p_strmode) = 'D' THEN
        DELETE FROM dbo.tblaccountcs WHERE fcoid = p_strcoid AND fcsaccountid = p_strcsaccountid AND fcs = 'S';
        DELETE FROM dbo.tblaccount   WHERE fcoid = p_strcoid AND faccountid   = p_strcsaccountid AND fgcs = 'S';
        RETURN;
    END IF;

    RAISE EXCEPTION 'Invalid mode %. Use S, M or D.', p_strmode;
END;
$BODY$;

ALTER PROCEDURE dbo.sp_pagesupplier OWNER TO postgres;