import { Outlet } from "react-router-dom";
import NavbarStudioWordmark from "@/components/navbars/NavbarStudioWordmark";

export default function Layout() {
  return (
    <div className="relative isolate min-h-svh flex flex-col bg-background text-foreground">
      <header data-webild-section="Header">
        <NavbarStudioWordmark
          brand="TWO"
          brandMark="/"
          brandEnd="300"
          href="#hero"
        />
      </header>
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}
