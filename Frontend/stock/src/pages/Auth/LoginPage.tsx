import React, { useState, useRef } from "react";
import {
  User,
  Lock,
  Building2,
  CalendarDays,
  ChevronDown,
  LogIn,
  EyeOff,
  Eye,
} from "lucide-react";
import { useCompanies } from "../../hooks/useCompanies";
import { useYears } from "../../hooks/useYears";
import { useLogin } from "../../hooks/useLogin";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const {
    companies,
    loading: companiesLoading,
    error: companiesError,
  } = useCompanies();

  const { login, loading: loginLoading, error: loginError } = useLogin();

  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [year, setYear] = useState("");

  const selectedCompanyId = companyId || companies[0]?.fCoID || "";

  const {
    years,
    loading: yearsLoading,
    error: yearsError,
  } = useYears(companyId || companies[0]?.fCoID || "");

  // Derived value — no effect needed, mirrors the companyId fallback pattern
  const selectedYear = years.some((y) => y.fYear.toString() === year)
    ? year
    : years[0]?.fYear.toString() || "";

  const userIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLSelectElement>(null);

  const navigate = useNavigate();

  // Default year selection once years load (mirrors old VB ItemIndex = 0 behavior)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await login({
      companyId: selectedCompanyId,
      year: selectedYear,
      userId,
      password,
    });

    if (!result) {
      return;
    }

    toast.success(result.message || "Login successful");

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      {/* Login Window */}
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Window Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600">
              <span className="text-sm font-bold text-white">C</span>
            </div>

            <span className="text-lg font-semibold text-slate-800">Login</span>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8 md:p-10">
          {/* Form Header */}
          <div className="mb-8 rounded-xl bg-linear-to-r from-emerald-100 to-emerald-50 px-7 h-13 py-2">
            <p className="mt-2 text-sm font-medium tracking-[0.28em] text-slate-600">
              Please login to connect
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mx-auto max-w-2xl space-y-5">
            {/* User ID */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-right text-base font-medium text-slate-800">
                User ID :
              </label>

              <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <User size={20} className="text-slate-500" />
                </div>

                <input
                  ref={userIdRef}
                  type="text"
                  value={userId}
                  name="userId"
                  maxLength={30}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                  className="w-full bg-transparent px-4 text-sm text-slate-800 outline-none"
                  autoFocus
                  required
                />
              </div>
            </div>
            {/* Password */}{" "}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              {" "}
              <label className="text-right text-base font-medium text-slate-800">
                {" "}
                Password :{" "}
              </label>{" "}
              <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                {" "}
                <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                  {" "}
                  <Lock size={20} className="text-slate-500" />{" "}
                </div>{" "}
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      companyRef.current?.focus();
                    }
                  }}
                  className="w-full bg-transparent px-4 text-sm text-slate-800 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex w-12 shrink-0 cursor-pointer items-center justify-center text-slate-500 transition hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {" "}
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}{" "}
                </button>{" "}
              </div>{" "}
            </div>
            {/* Company */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-right text-base font-medium text-slate-800">
                Company :
              </label>

              <div className="relative">
                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                    <Building2 size={20} className="text-slate-500" />
                  </div>

                  <select
                    ref={companyRef}
                    value={selectedCompanyId}
                    name="company"
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="h-full w-full cursor-pointer appearance-none bg-white px-4 pr-10 text-sm text-slate-800 outline-none"
                    required
                    disabled={companiesLoading}
                  >
                    {companiesLoading ? (
                      <option value="">Loading companies...</option>
                    ) : (
                      companies.map((company) => (
                        <option key={company.fCoID} value={company.fCoID}>
                          {company.fCoName_Short || company.fCoName}
                        </option>
                      ))
                    )}
                  </select>

                  <ChevronDown
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>
            </div>
            {/* Year */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-right text-base font-medium text-slate-800">
                Year :{" "}
              </label>
              <div className="relative w-64">
                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                    <CalendarDays size={19} className="text-slate-500" />{" "}
                  </div>
                  <select
                    ref={yearRef}
                    value={selectedYear}
                    name="year"
                    onChange={(e) => setYear(e.target.value)}
                    className="h-full w-full cursor-pointer appearance-none bg-white px-4 pr-10 text-sm text-slate-800 outline-none"
                    required
                    disabled={
                      yearsLoading || (!companyId && !companies[0]?.fCoID)
                    }
                  >
                    {yearsLoading ? (
                      <option value="">Loading years...</option>
                    ) : years.length === 0 ? (
                      <option value="">No years found</option>
                    ) : (
                      years.map((y) => (
                        <option key={y.fYear} value={y.fYear}>
                          {y.fYear}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>
            </div>
            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {loginError}
              </div>
            )}
            {companiesError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {companiesError}
              </div>
            )}
            {yearsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {yearsError}
              </div>
            )}
            {/* Buttons */}
            <button
              type="submit"
              disabled={loginLoading || companiesLoading}
              className="flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-emerald-500 px-6 py-3.5 text-lg font-semibold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={21} />

              {loginLoading ? "Logging in..." : "Login"}
            </button>
            {/* Bottom Information */}
            <div className="mt-7 border-t border-slate-200 pt-5 text-center">
              <p className="text-xs font-medium tracking-[0.2em] text-slate-500">
                SECURE ACCESS
                <span className="mx-3 text-emerald-400">|</span>
                RELIABLE RECORDS
                <span className="mx-3 text-emerald-400">|</span>
                SMARTER BUSINESS
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
