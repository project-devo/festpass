"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session";

const roleLabel = { student: "Student", organiser: "Organiser", volunteer: "Volunteer" } as const;

export function TopBar() {
  const { session, loading, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Each role only sees the links it can use
  const links = [
    { href: "/", label: "Events", show: true },
    { href: "/tickets", label: "My tickets", show: session?.role === "student" },
    { href: "/events/new", label: "Create event", show: session?.role === "organiser" },
  ].filter((link) => link.show);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-indigo-600">
          FestPass
        </Link>

        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {loading ? null : session ? (
            <>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {roleLabel[session.role]}
              </span>
              <button onClick={() => void handleLogout()} className="text-slate-600 hover:text-slate-900">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
