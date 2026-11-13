import React from "react";
import CloseButton from "../components/common/CloseButton";
import { useNavigate } from "react-router-dom";

const MatchHeader: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header className="flex h-6.5 items-center justify-center bg-[#9fdfbc] text-[18px] font-bold text-slate-700">
      <span className="px-2 text-[17px] font-semibold text-slate-700">Matching</span>

      <div className="ml-auto">
        <CloseButton onClose={() => navigate("/")} />
      </div>
    </header>
  );
};

export default MatchHeader; 1