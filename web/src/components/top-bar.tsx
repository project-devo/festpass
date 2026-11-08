"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session";
import { Logo } from "@/components/icons";
import { buttonClass } from "@/components/ui";

const roleLabel = { student: "Student", organiser: "Organiser", volunteer: "Volunteer" } as const;

export function TopBar() {
  const { session, loading, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Each role only sees the links it can use
  const links = [
    { href: "/events", label: "Events", show: true },
    { href: "/tickets", label: "My tickets", show: session?.role === "student" },
    { href: "/events/new", label: "Create event", show: session?.role === "organiser" },
    { href: "/scan", label: "Scan tickets", show: session?.role === "volunteer" },
  ].filter((link) => link.show);

  // "Events" stays highlighted on an event's own page, but not on "Create event"
  const isActive = (href: string) =>
    pathname === href || (href === "/events" && pathname.startsWith("/events/") && pathname !== "/events/new");

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-950">
          <Logo />
          FestPass
        </Link>

        <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 transition ${
                isActive(link.href) ? "bg-zinc-100 font-medium text-zinc-950" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm">
          {loading ? null : session ? (
            <>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {roleLabel[session.role]}
              </span>
              <button onClick={() => void handleLogout()} className={buttonClass("ghost", "px-3 py-1.5")}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "px-3 py-1.5")}>
                Log in
              </Link>
              <Link href="/register" className={buttonClass("primary", "px-3 py-1.5")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
