"use client"

import type React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import toast from "react-hot-toast"

interface AppLayoutProps {
  children: React.ReactNode
}

const queryClient = new QueryClient()

export default function InAppLayout({ children }: AppLayoutProps) {
 
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <div className="bg-grey-1000"><main>{children}</main></div>
          <Toaster />
      </QueryClientProvider>
    </div>
  )
}