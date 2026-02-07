"use client"
import React from "react"
import { useGasSavings } from "@/lib/hooks"

export const GasSavingBanner = () => {
  const { formatted, operationsCount } = useGasSavings()

  return (
    <div>
      <div className="max-w-full p-4 md:p-7 border-primary/10 border-[1px] bg-primary/1 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-7 gap-4">
          <div className="space-y-3">
            <p className="uppercase text-sm text-grey-300 font-medium">
              gas saved by yellow
            </p>
            <p className="text-4xl font-medium text-primary">
              {formatted.totalSaved}
            </p>
            <p className="text-xs text-grey-300 font-mono">
              vs on-chain transactions
            </p>
          </div>
          <div className="space-y-3">
            <p className="uppercase text-sm text-grey-300 font-medium">
              would have cost
            </p>
            <p className="text-4xl font-medium text-red-400 line-through">
              {formatted.wouldHaveCost}
            </p>
            <p className="text-xs text-grey-300 font-mono">
              at current gas prices
            </p>
          </div>

          <div className="space-y-3">
            <p className="uppercase text-sm text-grey-300 font-medium">
              actual price
            </p>
            <p className="text-4xl font-medium">{formatted.actualCost}</p>
            <p className="text-xs text-grey-300 font-mono text-primary">
              {formatted.savingsPercent} savings
            </p>
          </div>
          <div className="space-y-3">
            <p className="uppercase text-sm text-grey-300 font-medium">
              Operations processed
            </p>
            <p className="text-4xl font-medium">{operationsCount}</p>
            <p className="text-xs text-grey-300 font-mono">
              off-chain via state channels
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-[50px] h-[2px] bg-primary" />
        <div className="absolute bottom-0 right-0 w-[2px] h-[50px] bg-primary" />
      </div>
    </div>
  )
}
