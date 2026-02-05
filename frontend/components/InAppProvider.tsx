"use client"

import type React from "react"
import { Toaster } from "react-hot-toast"

interface AppLayoutProps {
  children: React.ReactNode
}

// QueryClientProvider has been moved to Web3Provider at the root level
// to share a single QueryClient instance between wagmi and app queries

export default function InAppLayout({ children }: AppLayoutProps) {
  return (
    <div>
      <div className="bg-grey-1000">
        <main>{children}</main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fdfdff',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#c3ff49',
              secondary: '#000000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  )
}