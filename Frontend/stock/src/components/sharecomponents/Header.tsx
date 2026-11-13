import { useNavigate } from "react-router-dom";
import CloseButton from "../common/CloseButton";

const Header = ({ Name }: { Name: string }) => {
  const navigate = useNavigate();

  return (
    <header className="flex h-9 items-center border-b border-slate-300 bg-[#a3dfc0] pr-2">
      <h1 className="ml-4 text-[17px] font-semibold">
        {Name}
      </h1>

      <div className="ml-auto">
        <CloseButton onClose={() => navigate("/")} />
      </div>
    </header>
  );
};

export default Header;