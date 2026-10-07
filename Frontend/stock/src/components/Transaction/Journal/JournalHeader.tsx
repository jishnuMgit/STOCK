import React from "react";

const JournalHeader: React.FC = () => {
  return (
     <header className="flex h-9 shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
            <span className="px-5 text-[1.0625rem] font-semibold text-slate-700">
             Journal
            </span>
          </header>
  );
};

export default JournalHeader;