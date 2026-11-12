import { IoMdClose } from "react-icons/io";
import { useNavigate } from "react-router-dom";

const Header = ({ Name }: { Name: string }) => {
  const navigate = useNavigate();

  return (
    <header className="relative flex h-8.25 items-center bg-[#9fdfbc] text-gray-800">
      <h1 className="ml-4 text-[17px] font-semibold">
        {Name}
      </h1>

      <button
        type="button"
        className="absolute right-2 cursor-pointer rounded-md p-1 hover:bg-red-50"
        onClick={() => navigate("/")}
      >
        <IoMdClose size={17} />
      </button>
    </header>
  );
};

export default Header;