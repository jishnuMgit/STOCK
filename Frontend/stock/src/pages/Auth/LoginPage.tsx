import React, { useState } from "react";
import {
  User,
  Lock,
  Building2,
  CalendarDays,
  ChevronDown,
  LogIn,
} from "lucide-react";

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("CARAVAN TRAVEL");
  const [year, setYear] = useState("2026");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [language, setLanguage] = useState("English");
  const [changePassword, setChangePassword] = useState(false);

  const handleLogin = () => {
    console.log({
      userId,
      password,
      company,
      year,
      language,
      changePassword,
    });
  };

  const handleClose = () => {
    console.log("Close");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      {/* Login Window */}
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Window Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
              <span className="text-sm font-bold text-white">C</span>
            </div>

            <span className="text-lg font-semibold text-slate-800">Login</span>
          </div>

          <div className="flex items-center gap-5 text-slate-500">
            <button
              type="button"
              className="text-xl leading-none hover:text-slate-800"
            >
              −
            </button>

            <button
              type="button"
              className="text-lg leading-none hover:text-slate-800"
            >
              □
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="text-xl leading-none hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8 md:p-10">
          {/* Form Header */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-emerald-100 to-emerald-50 px-7 py-6">
            <h1 className="text-3xl font-bold tracking-tight uppercase text-slate-900">
              Stock
            </h1>

            <p className="mt-2 text-sm font-medium tracking-[0.28em] text-slate-600">
              PLEASE LOGIN TO CONTINUE
            </p>
          </div>

          {/* Form */}
          <div className="mx-auto max-w-2xl space-y-5">
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
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-transparent px-4 text-sm text-slate-800 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-right text-base font-medium text-slate-800">
                Password :
              </label>

              <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <Lock size={20} className="text-slate-500" />
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent px-4 text-sm text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Company */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-right text-base font-medium text-slate-800">
                Company :
              </label>

              <div className="relative">
                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                    <Building2 size={20} className="text-slate-500" />
                  </div>

                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full appearance-none bg-white px-4 pr-10 text-sm text-slate-800 outline-none"
                  >
                    <option value="CARAVAN TRAVEL">CARAVAN TRAVEL</option>

                    <option value="CARAVAN TOURS">CARAVAN TOURS</option>
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
                Year :
              </label>

              <div className="relative w-64">
                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                    <CalendarDays size={19} className="text-slate-500" />
                  </div>

                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full appearance-none bg-white px-4 pr-10 text-sm text-slate-800 outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>

                  <ChevronDown
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Language */}
            {/* <div className="grid grid-cols-[120px_1fr] items-center gap-4">

              <label className="text-right text-base font-medium text-slate-800">
                Language :
              </label>

              <div className="relative w-64">

                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white">

                  <div className="flex w-14 items-center justify-center border-r border-slate-200 bg-slate-50">
                    <Globe2
                      size={19}
                      className="text-slate-500"
                    />
                  </div>

                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value)
                    }
                    className="w-full appearance-none bg-white px-4 pr-10 text-sm text-slate-800 outline-none"
                  >
                    <option value="English">
                      English
                    </option>

                    <option value="Arabic">
                      Arabic
                    </option>
                  </select>

                  <ChevronDown
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                </div>
              </div>
            </div> */}

            {/* Change Password */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4 pt-1">
              <div />

              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 accent-emerald-500"
                />
                Change Password
              </label>
            </div>

            {/* Buttons */}

            <button
              type="button"
              onClick={handleLogin}
              className="flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-emerald-500 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg active:scale-[0.99]"
            >
              <LogIn size={21} />
              Login
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
