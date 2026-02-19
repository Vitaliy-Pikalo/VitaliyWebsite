"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { name: "Home", href: "/browse" },
  { name: "Professional", href: "/work-experience" },
  { name: "Skills", href: "/skills" },
  { name: "Projects", href: "/projects" },
  { name: "Hire Me", href: "/contact-me" },
];

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="navbar-left">
          <span
            className="navbar-logo"
            onClick={() => router.push("/browse")}
            onKeyDown={(e) => e.key === "Enter" && router.push("/browse")}
            role="button"
            tabIndex={0}
          >
            VP
          </span>
          <ul className="navbar-links">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link href={link.href}>{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="navbar-right">
          <div
            className="profile-icon"
            onClick={() => router.push("/browse")}
            onKeyDown={(e) => e.key === "Enter" && router.push("/browse")}
            role="button"
            tabIndex={0}
          >
            V
          </div>
          <div
            className="hamburger"
            onClick={() => setIsSidebarOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsSidebarOpen(true)}
          >
            <div />
            <div />
            <div />
          </div>
        </div>
      </nav>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === "Escape" && closeSidebar()}
        role="button"
        tabIndex={-1}
      />

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <span className="navbar-logo" style={{ marginBottom: "20px" }}>VP</span>
        <ul>
          {navLinks.map((link) => (
            <li key={link.name}>
              <Link href={link.href} onClick={closeSidebar}>
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
