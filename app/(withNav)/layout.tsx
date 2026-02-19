import NavBar from "@/components/Navbar";

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#141414]">
      <NavBar />
      {children}
    </div>
  );
}
