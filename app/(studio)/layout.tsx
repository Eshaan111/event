import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrgId } from "@/lib/org";
import SideNav from "@/app/components/SideNav";
import TopNav from "@/app/components/TopNav";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId  = session?.user?.id ?? null;

  // If the JWT user ID no longer exists in the DB (e.g. after a dev re-seed),
  // force re-sign-in so the user gets a fresh token with the new ID.
  if (userId) {
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) redirect("/register");
  }

  // Students have their own portal — redirect them away from the studio.
  if (userId) {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (student) redirect("/student");
  }

  const orgId = await getOrgId(userId);
  if (!orgId) redirect("/onboarding");

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
