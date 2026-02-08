"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"
import { ConnectWallet } from "./wallet/ConnectWallet"

const links = [
  { pathname: "Dashboard", route: "/dashboard" },
  { pathname: "Agent", route: "/agent" },
  { pathname: "setup", route: "/setup" },
  { pathname: "Sessions", route: "/sessions" },
  { pathname: "Swap", route: "/swap" },
  { pathname: "Transactions", route: "/" },
]

export const Header = () => {
  const pathname = usePathname()
  return (
    <header className="fixed top-0 left-0 h-[80px] w-full border-[1px] border-grey-800 bg-grey-1000 z-[10] text-white">
      <div className="w-full h-full flex items-center justify-between mx-auto p-4 max-w-[1700px]">
        <p className="font-veneer text-[18px] uppercase">Agent-Paymaster</p>
        <div>
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.route}
                href={link.route}
                className={`hover:text-grey-100 uppercase text-xs tracking-widest font-mono ${
                  pathname === link.route ? "text-primary" : "text-grey-400"
                }`}
              >
                {link.pathname}
              </Link>
            ))}
            <ConnectWallet />
          </div>
        </div>
      </div>
    </header>
  )
}
