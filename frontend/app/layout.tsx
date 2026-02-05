import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import "./globals.css"
import { Web3Provider } from "@/components/providers/Web3Provider"
import { AntConfigProvider } from "@/components/AntConfigProvider"
import { SmoothScroll } from "@/components/SmoothScroll"
import { YellowProvider } from "@/components/providers/YellowProvider"

const ibm_plex = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
})

const ibm_plex_mono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"]
})


export const metadata: Metadata = {
  title: "Agent Paymaster",
  description: "AI Agent Spending Control with Yellow Network State Channels",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibm_plex.variable} ${ibm_plex_mono.variable} ${ibm_plex.className} antialiased`}
      >
        <Web3Provider>
          <AntConfigProvider>
            <SmoothScroll>
              <YellowProvider>
                <div className="">
                  {children}
                </div>
              </YellowProvider>
            </SmoothScroll>
          </AntConfigProvider>
        </Web3Provider>
      </body>
    </html>
  )
}
