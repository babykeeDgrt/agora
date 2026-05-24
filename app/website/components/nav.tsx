"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";

import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Marketplace" },
  { href: "/spawn", label: "Spawn Agent" },
  { href: "/feed", label: "Live Feed" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-foreground"
          >
            <span className="relative size-8 overflow-hidden rounded-full border border-border bg-surface">
              <Image
                src="/agora_logo.jpg"
                alt="Agora logo"
                fill
                className="object-cover"
                sizes="32px"
              />
            </span>
            Agora
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition-opacity",
                    active
                      ? "border border-white/15 bg-white text-black"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden md:block">
          <WalletButton />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          <Menu className="size-4" />
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    active
                      ? "border-white/20 bg-white text-black"
                      : "border-border bg-surface text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2">
              <WalletButton fullWidth />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
