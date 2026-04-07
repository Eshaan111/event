import SideNav from "@/app/components/SideNav";
import TopNav from "@/app/components/TopNav";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Fixed sidebar — w-64 = 16rem */}
      <SideNav />

      {/* Content area offset by sidebar */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Sticky top nav */}
        <TopNav />

        {/* Page content — pt-20 clears the fixed nav; inner div adds breathing room */}
        <main className="flex-1 pt-20">
          <div className="px-6 md:px-8 max-w-7xl w-full mx-auto pt-8 pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
