import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";
import SetBranchInfo from "../pages/Settings/SetBranchInfoPage";
import PublicRoute from "./PublicRoute";
import CustomerList from "../pages/Finance/Setup/CustomerListPage";
import ChartOfAccountList from "../pages/Finance/Setup/COAListPage";
import UserLogin from "../pages/Security/UserLogin/UserLoginPage";
import SetChartOfAccount from "../pages/Settings/SetChartOfAccountPage";
import UserPermission from "../pages/Security/UserPermissionMenu/UserPermissionMenuPage";
import BeginningStockPage from "../pages/Purchase/Transaction/BeginningStockPage";
import UserPermissionBranchPage from "../pages/Security/UserPermissionBranch/UserPermissionBranchPage";
import SetPostingAccountPage from "../pages/Settings/SetPostingAccountPage";
import PurchaseInvoicePage from "../pages/Purchase/Transaction/PurchaseInvoicePage";
import PurchaseExpense from "../components/Transaction/PurchaseInvoice/PurchaseInvoiceExpense";
import SalesInvoice from "../pages/Sales/Transaction/SalesInvoicePage";
import StockTransfer from "../pages/Sales/Transaction/stock/StockTransferPage";
import StockTransferPrint from "../pages/Sales/Transaction/stock/StockTransferPrintPage";
import BeginningBalance from "../pages/Finance/Transaction/BeginningBalance/BeginningBalance";
import ItemGroupPage from "../pages/Purchase/Setup/ItemGroupPage";
import CompanyPage from "../pages/Administration/CompanyPage";
import ActivePeriodPage from "../pages/Settings/ActivePeriodPage";
import StockAdjustmentPage from "../pages/Sales/Transaction/stock/StockAdjustmentPage";
import SetDefaultBranch from "../pages/Settings/SetDefaultBranchPage";
import SetActivePeriod from "../pages/Settings/SetActivePeriodPage";
import ItemEnquiryPage from "../pages/Sales/Setup/ItemEnquiryPage";
import UnitPage from "../pages/Purchase/Setup/UnitPage";
import StaffPage from "../pages/Purchase/Setup/StaffPage";
import UserAudit from "../pages/Security/UserAudit/UserAuditPage";
import UserAuditPrint from "../pages/Security/UserAudit/UserAuditPrintPage";
import UserTransactionAudit from "../pages/Security/UserTransactionAudit/UserTransactionAuditPage";
import StockDocumentPost from "../pages/Sales/Transaction/stock/StockDocumentPostPage";
import StockDocumentPostCancel from "../pages/Sales/Transaction/stock/StockDocumentPostCancel";
import StockDocumentRePost from "../pages/Sales/Transaction/stock/StockDocumentRePost";
import RptGLPage from "../pages/Finance/Report/GeneralLedger/GeneralLedger/RptGLPage";
import MatchingPage from "../pages/Finance/Transaction/Match/MatchPage";
import UnMatchPage from "../pages/Finance/Transaction/MatchReversal/MatchReversalPage";
import CostCenterPage from "../pages/Finance/Setup/CostCenterPage";
import MatchEnquiryPage from "../pages/Finance/Transaction/MatchEnquiry/MatchEnquiryPage";
import RptTBPage from "../pages/Finance/Report/FinalAccounts/TrialBalance/RptRBPage";
import RptStockPage from "../pages/Sales/Report/RptStockPage";
import RptStockValuePage from "../pages/Sales/Report/RptSVPage";
import RptCustomerSalesPage from "../pages/Sales/Report/RptCustomerSalesPage";
import RptItemSalesPage from "../pages/Sales/Report/RptItemSalesPage";
import CustomerSupplierCountryPage from "../pages/Finance/Setup/CustomerSupplierCountryPage";
import InactivateAccountPage from "../pages/Finance/Setup/InactivateAccountPage";
import CurrencyPage from "../pages/Purchase/Setup/CurrencyPage";
import RptReceivablesPage from "../pages/Finance/Report/A-R_and_A-P/Receivables/RptReceivablesPage";
import RptAgeingReceivablesPage from "../pages/Finance/Report/A-R_and_A-P/AgeingOfReceivables/AgeingOfReceivablesPage";
import RptPayablesPage from "../pages/Finance/Report/A-R_and_A-P/Payables/RptPayablesPage";
import RptAgeingOfPayablesPage from "../pages/Finance/Report/A-R_and_A-P/AgeingOfPayables/RptAgeingOfPayablesPage";
import RptPLPage from "../pages/Finance/Report/FinalAccounts/ProfitLoss/RptPLPage";
import RptBalanceSheetPage from "../pages/Finance/Report/FinalAccounts/BalanceSheet/RptBalanceSheetPage";
import RptChartOfAccountPage from "../pages/Finance/Report/ChartOfAccount/RptChartOfAccountPage";
import RptCustomerListPage from "../pages/Finance/Report/CustomerList/RptCustomerListPage";
import RptSupplierListPage from "../pages/Finance/Report/SupplierList/RptSupplierListPage";
import RptSupplierPurchasePage from "../pages/Purchase/Report/SupplierPurchase/RptSupplierPurchasePager";
import RptItemPurchasePage from "../pages/Purchase/Report/ItemPurchase/RptItemPurchasePage";
import RptPOSummaryPage from "../pages/Purchase/Report/POSummary/RptPOSummaryPage";
import RptStaffSalesPage from "../pages/Purchase/Report/StaffSales/RptStaffSalesPage";
import RptSalesSummaryPage from "../pages/Purchase/Report/SalesSummary/RptSalesSummaryPage";
import RptItemMovementPage from "../pages/Purchase/Report/ItemMovement/RptItemMovementPage";
import RptInvoicewiseProfitPage from "../pages/Purchase/Report/InvoicewiseProfit/RptInvoicewiseProfitPage";
import RptStockReportPage from "../pages/Purchase/Report/Stock/RptStockReportPage";
import RptStockValuationPage from "../pages/Purchase/Report/StockValue/RptStockValuationPage";
import RptStockVerificationPage from "../pages/Purchase/Report/StockVerification/RptStockVerificationPage";
import RptStockAgeingPage from "../pages/Purchase/Report/StockAgeing/RptStockAgeingPage";
import RptDocumentListPage from "../pages/Purchase/Report/DocumentList/RptDocumentListPage";
import RptSalesPriceListPage from "../pages/Purchase/Report/SalesPriceList/RptSalesPriceListPage";
import RptItemListPage from "../pages/Purchase/Report/ItemList/RptItemListPage";
import RptItemHistoryPage from "../pages/Purchase/Report/ItemHistory/RptItemHistoryPage";
import RptGeneralLedgerGroup from "../pages/Finance/Report/GeneralLedger/GeneralLedgerGroup/RptGeneralLedgerGroupPage";
import RptFinYearCloseBalPage from "../pages/Finance/Report/YearCloseBalance/RptFinYearCloseBalPage";
import RptGeneralLedgerSummaryPage from "../pages/Finance/Report/GeneralLedger/GeneralLedgerSummary/RptGeneralLedgerSummaryPage";
import DocumentPostPage from "../pages/Finance/Transaction/DocumentPost/DocumentPostPage";
import RptDocumentPrintPage from "../pages/Finance/Transaction/DocumentPrint/RptDocumentPrintPage";
import RptExpenseSumPage from "../pages/Finance/Report/ExpenseSummary/RptExpenseSumPage";
import RptReceiptPaymentSumPage from "../pages/Finance/Report/ReceiptPaymentSum/RptReceiptPaymentSumPage";
import RptFinDocList from "../pages/Finance/Report/DocumentsList/RptFinDocList";
import SalesPriceListPage from "../pages/Sales/Setup/SalesPriceListPage";
import BeginningStockPrintPage from "../pages/Purchase/Transaction/BeginningStockPrintPage";
import RptIncomeSumPage from "../pages/Finance/Report/IncomeSummary/RptIncomeSumPage";
import RptDocumentExportPage from "../pages/Finance/Report/DocumentExportPage/RptDocumentExportPage";
import SetReceivableAgeingPeriod from "../pages/Settings/SetReceivableAgeingPeriodPage";
import SetDatabaseBackupPathPage from "../pages/Settings/SetDatabaseBackupPathPage";
import ChangeLoginYear from "../pages/Settings/ChangeLoginYearPage";
import FinanceYearClose from "../pages/Utility/FinanceYearClose";


const Login = lazy(() => import("../pages/Auth/LoginPage"));
const ReceiptPage = lazy(
  () => import("../pages/Finance/Transaction/Receipt/ReceiptPage"),
);
const Journalpage = lazy(
  () => import("../pages/Finance/Transaction/Journal/Journalpage"),
);
const Matching = lazy(
  () => import("../pages/Finance/Transaction/Match/MatchPage"),
);
const UnMatch = lazy(
  () => import("../pages/Finance/Transaction/MatchReversal/MatchReversalPage"),
);

// Finance - Setup
const CustomerPage = lazy(() => import("../pages/Finance/Setup/CustomerPage"));

// Purchase - Setup
const ItemPage = lazy(() => import("../pages/Purchase/Setup/ItemPage"));

// Settings
const SetCompanyInfo = lazy(
  () => import("../pages/Settings/SetCompanyInfoPage"),
);

// Finance - Reports
const RptSOAPage = lazy(
  () =>
    import("../pages/Finance/Report/A-R_and_A-P/StatementOfAccount/RptSOAPage"),
);

const PageLoader = () => (
  <div className="flex h-full min-h-75 items-center justify-center text-[13px] text-slate-600">
    Loading...
  </div>
);

// Shown at "/" - replace with your real home/dashboard later
const Home = () => <div className="p-4 text-[13px] text-slate-600" />;

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected - everything below requires login */}
        <Route element={<ProtectedRoute />}>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* ================= FINANCE - TRANSACTION ================= */}

          <Route path="/Finance/Transaction/Receipt"  element={<ReceiptPage />}  />
          <Route path="/Finance/Transaction/journal"  element={<Journalpage />} />
          <Route path="/Finance/Transaction/Transaction-matching"  element={<Matching />}/>
          <Route path="/Finance/Transaction/Transaction-unmatching"   element={<UnMatch />}  />
          <Route path="/Finance/Transaction/BeginningBalance" element={<BeginningBalance />} />
          <Route path="/Finance/Transaction/FinDocPost" element={<DocumentPostPage/>}/>
          <Route path="/Finance/Transaction/FinDocPrint" element={<RptDocumentPrintPage/>}/>

          {/* ================= FINANCE - SETUP ================= */}

          <Route path="/Finance/Setup/CustomerPage" element={<CustomerList />} />
          <Route path="/Finance/Setup/Add/Customer" element={<CustomerPage />} />
          <Route path="/Finance/Setup/ChartOfAccountList" element={<ChartOfAccountList />} />
          <Route path="/Finance/Setup/CostCenter" element={<CostCenterPage/>} />
          <Route path="/Finance/Setup/CustomerSupplierCountry" element={<CustomerSupplierCountryPage/>}  />
          <Route path="/Finance/Setup/InactivateAccount" element={<InactivateAccountPage/>}/>

          {/* ================= FINANCE - REPORTS ================= */}
  
          <Route path="/Finance/Reports/rptSOA" element={<RptSOAPage />}/>
          <Route path="/Finance/Reports/rptGL" element={<RptGLPage/>}/>
          <Route path="/Finance/Reports/rptTB" element={<RptTBPage/>}  />
          <Route path="/Finance/Reports/RptAgeingDr" element={<RptAgeingReceivablesPage/>}/>
          <Route path="/Finance/Reports/RptReceivables" element={<RptReceivablesPage/>}/>
          <Route path="/Finance/Reports/RptPayables" element={<RptPayablesPage/>}/>
          <Route path="/Finance/Reports/RptAgeingCr" element={<RptAgeingOfPayablesPage/>}/>
          <Route path="/Finance/Reports/RptPL" element={<RptPLPage/>}/>
          <Route path="/Finance/Reports/RptBS" element={<RptBalanceSheetPage/>}/>
          <Route path="/Finance/Reports/RptChartOfAccount" element={<RptChartOfAccountPage/>}/>
          <Route path="/Finance/Reports/RptCustomerList" element={<RptCustomerListPage/>}/>
          <Route path="/Finance/Reports/RptSupplierList" element={<RptSupplierListPage/>}/>
          <Route path="/Finance/Reports/RptGLGroup" element={<RptGeneralLedgerGroup/>}/>
          <Route path="/Finance/Reports/RptFinYearCloseBal" element={<RptFinYearCloseBalPage/>}/>
          <Route path="/Finance/Reports/RptGLSum" element={<RptGeneralLedgerSummaryPage/>}/>
          <Route path="/Finance/Reports/RptExpenseSum" element={<RptExpenseSumPage/>}/>
          <Route path="/Finance/Reports/RptRVPVSum" element={<RptReceiptPaymentSumPage/>}/>
          <Route path="/Finance/Reports/RptFinDocList" element={<RptFinDocList/>}/>
          <Route path="/Finance/Reports/RptIncomeSum" element={<RptIncomeSumPage/>}/>
          <Route path="/Finance/Reports/RptDocumentExport" element={<RptDocumentExportPage/>}/>

          {/* ================= SALES - TRANSACTION ================= */}

          <Route path="/Sales/Transaction/SalesInvoicePage" element={<SalesInvoice />}/>
          <Route path="/Sales/Transaction/StockAdjustment"  element={<StockAdjustmentPage/>} />
          <Route path="/Sales/Transaction/StockTransferPage" element={<StockTransfer />}/>
          <Route path="/Sales/Transaction/StockTransferPage/Print" element={<StockTransferPrint />}/>
          <Route path="/Sales/Transaction/StockDocumentPost" element={<StockDocumentPost/>}/>
          <Route path="/Sales/Transaction/StockDocumentRePost" element={<StockDocumentRePost/>}/>

          {/* ================= SALES - SETUP ================= */}

          <Route path="/Sales/Setup/ItemEnquiry" element={<ItemEnquiryPage/>} />
          <Route path="/Sales/Setup/SalesPriceList" element={<SalesPriceListPage/>}/>

          {/* ================= SALES - REPORT ================= */}

          <Route path="/Sales/Report/RptStock" element={<RptStockPage />} />
          <Route
            path="/Sales/Reports/StockValue"
            element={<RptStockValuePage />}
          />
          <Route
            path="/Sales/Reports/RptCustomerSales"
            element={<RptCustomerSalesPage />}
          />
          <Route
            path="/Sales/Reports/RptItemSales"
            element={<RptItemSalesPage />}
          />

          {/* ================= PURCHASE - TRANSACTION ================= */}

          <Route path="/Purchase/Transaction/PurchaseInvoicePage" element={<PurchaseInvoicePage />}/>
          <Route path="/Purchase/Transaction/BeginningStockPage" element={<BeginningStockPage />} />
          <Route path="/Purchase/Transaction/BeginningStockPage/Print" element={<BeginningStockPrintPage />} />
          <Route path="/Purchase/Setup/UnitPage" element={<UnitPage/>} />
          <Route path="/Purchase/Setup/StaffPage" element={<StaffPage/>} />

          {/* ================= PURCHASE - SETUP ================= */}

          <Route path="/Purchase/Setup/ItemPage" element={<ItemPage />} />
          <Route
            path="/Purchase/Setup/ItemGroupPage"
            element={<ItemGroupPage />}
          />
          <Route path="/Purchase/Setup/Currency" element={<CurrencyPage />} />

          {/* ================= PURCHASE - REPORT ================= */}

          <Route
            path="/Purchase/Report/RptSupplierPurchase"
            element={<RptSupplierPurchasePage />}
          />
          <Route
            path="/Purchase/Report/RptItemPurchase"
            element={<RptItemPurchasePage />}
          />
          <Route
            path="/Purchase/Report/RptPOSummary"
            element={<RptPOSummaryPage />}
          />
          <Route
            path="/Purchase/Report/RptStaffSales"
            element={<RptStaffSalesPage />}
          />
          <Route
            path="/Purchase/Report/RptSalesSummary"
            element={<RptSalesSummaryPage />}
          />
          <Route
            path="/Purchase/Report/RptItemMovement"
            element={<RptItemMovementPage />}
          />
          <Route
            path="/Purchase/Report/RptInvoicewiseProfit"
            element={<RptInvoicewiseProfitPage />}
          />
          <Route
            path="/Purchase/Report/RptStockReport"
            element={<RptStockReportPage />}
          />
          <Route
            path="/Purchase/Report/RptStockValuation"
            element={<RptStockValuationPage />}
          />
          <Route
            path="/Purchase/Report/RptStockVerification"
            element={<RptStockVerificationPage />}
          />
          <Route
            path="/Purchase/Report/RptStockAgeing"
            element={<RptStockAgeingPage />}
          />
          <Route
            path="/Purchase/Report/RptDocumentList"
            element={<RptDocumentListPage />}
          />
          <Route
            path="/Purchase/Report/RptSalesPriceList"
            element={<RptSalesPriceListPage />}
          />
          <Route
            path="/Purchase/Report/RptItemList"
            element={<RptItemListPage />}
          />
          <Route
            path="/Purchase/Report/RptItemHistory"
            element={<RptItemHistoryPage />}
          />

          {/* ================= SETTINGS ================= */}

          <Route path="/Settings/SetCompanyInfo" element={<SetCompanyInfo />} />
          <Route path="/Settings/SetBranchInfo" element={<SetBranchInfo />} />
          <Route path="/Settings/SetChartOfAccount" element={<SetChartOfAccount />} />
          <Route path="/Setting/SetDefaultBranch" element={<SetDefaultBranch />} />
          <Route path="/Setting/SetActivePeriod" element={<SetActivePeriod />} />
          {/* the screen's earlier address - kept so old bookmarks still open it */}
          {/* <Route path="/Settings/ChartOfAccountSettings" element={<Navigate to="/Settings/SetChartOfAccount" replace />}
          /> */}
          <Route path="/Settings/SetPostingAccount" element={<SetPostingAccountPage />}/>
          <Route path="/Setting/SetActivePeriod"  element={<ActivePeriodPage />}   />
          <Route path="/Setting/SetDrAgeingPeriod" element={<SetReceivableAgeingPeriod/>}/>
          <Route path="/Setting/SetDatabaseBackupPath" element={<SetDatabaseBackupPathPage/>}/>
          <Route path="/Setting/ChangeLoginYear" element={<ChangeLoginYear/>}/>

          {/* ================= DOCUMENT NUMBER ================= */}

          <Route path="/Settings/SetDocumentNo" element={<SetDocumentNo />} />

          {/* ================= SECURITY ================= */}

          <Route path="/Security/UserLogin" element={<UserLogin />} />
          <Route
            path="/Security/UserPermissionMenu"
            element={<UserPermission />}
          />
          <Route
            path="/Security/UserPermissionBranch"
            element={<UserPermissionBranchPage />}
          />
          <Route path="/Security/UserAudit" element={<UserAudit />} />

          {/* the print page the User Audit dialog opens (no menu entry of its own) */}
          <Route
            path="/Security/UserAudit/Print"
            element={<UserAuditPrint />}
          />
          <Route
            path="/Security/UserTransactionAudit"
            element={<UserTransactionAudit />}
          />
    {/* ================= Utility ================= */}



          <Route path="/Utility/FinYearClose" element={<FinanceYearClose/>}/>

          {/* ================= ADMINISTRATION ================= */}

          <Route path="/Administration/CompanyPage" element={<CompanyPage />} />

          {/* ================= DEV ================= */}

          <Route path="/dev/PurchaseExpense" element={<PurchaseExpense />} />
          <Route
            path="/dev/StockDocumentPostCancel"
            element={<StockDocumentPostCancel />}
          />
          <Route path="/dev/matchpage" element={<MatchingPage />} />
          <Route path="/dev/unmatchpage" element={<UnMatchPage />} />
          <Route path="/dev/MatchEnquiryPage" element={<MatchEnquiryPage />} />

          {/* Unknown URL -> back to "/" ("/" has its own element, so no loop) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
