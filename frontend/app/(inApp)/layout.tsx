import type { Metadata } from "next"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import InAppLayout from "@/components/InAppProvider"
// import "../globals.css"

export const metadata: Metadata = {
  title: "Paymaster App",
  description: "Paymaster App",
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div>
      <InAppLayout>
        <Header />
        <Sidebar />
        <div className="mt-[80px] ml-[100px] p-4 text-white min-h-screen">{children}</div>
      </InAppLayout>
    </div>
  )
}