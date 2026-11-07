
const Header = ({ Name }: { Name: string }) => {
  return (
    <header className="flex h-8.25 items-center bg-[#9fdfbc] text-gray-800">
      <h1 className="ml-4 text-[17x] font-semibold ">
         {Name}
     </h1>
   </header>
  )
}

export default Header