ALTER TABLE IF EXISTS dbo.tblstocktrans
    ADD COLUMN fzatcacleared boolean DEFAULT False;

    ALTER TABLE IF EXISTS dbo.tblstocktrans
    ADD COLUMN finvdatetime timestamp without time zone;

    ALTER TABLE IF EXISTS dbo.tblfintrans
    ADD COLUMN fzatcacleared boolean DEFAULT False;

    ALTER TABLE IF EXISTS dbo.tblfintrans
    ADD COLUMN ftaxableamt numeric(18, 2);

    ALTER TABLE IF EXISTS dbo.tblfintrans
    ADD COLUMN finvrcntype character varying(5);