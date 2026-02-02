"use client"
import React from "react"

export const ActiveStateChannels = () => {
  return (
    <div>
      <p className="font-mono mb-4">Active state channels</p>
      <div className="space-y-4">
        <div className="p-4 border border-grey-700 bg-grey-900">
          <div className="flex items-center justify-between gap-4">
            <div className="">
              <p>Trading Bot Alpha</p>
              <p className="text-xs font-mono text-grey-300">0x4a21...8f3c</p>
            </div>
            <p className="text-[10px] bg-primary/10 rounded-full text-primary px-3 py-1 uppercase">
              Active
            </p>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="">
                <p className="text-grey-200">Balance</p>
                <p className="font-mono text-[16px] font-medium">$2,500</p>
              </div>
              <div className="">
                <p className="text-grey-200">Operations</p>
                <p className="font-mono text-[16px] font-medium">167</p>
              </div>
            </div>
          </div>
          <div className="text-xs bg-primary/7 p-3 flex items-center justify-between gap-4 mt-3">
            <p>Gas saved</p>
            <p className="text-primary font-mono font-medium">+$0.067</p>
          </div>
        </div>

        <div className="p-4 border border-grey-700 bg-grey-900">
          <div className="flex items-center justify-between gap-4">
            <div className="">
              <p>Trading Bot Alpha</p>
              <p className="text-xs font-mono text-grey-300">0x4a21...8f3c</p>
            </div>
            <p className="text-[10px] bg-primary/10 rounded-full text-primary px-3 py-1 uppercase">
              Active
            </p>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="">
                <p className="text-grey-200">Balance</p>
                <p className="font-mono text-[16px] font-medium">$1,500</p>
              </div>
              <div className="">
                <p className="text-grey-200">Operations</p>
                <p className="font-mono text-[16px] font-medium">56</p>
              </div>
            </div>
          </div>
          <div className="text-xs bg-primary/7 p-3 flex items-center justify-between gap-4 mt-3">
            <p>Gas saved</p>
            <p className="text-primary font-mono font-medium">+$0.067</p>
          </div>
        </div>

        <div className="p-4 border border-grey-700 bg-grey-900">
          <div className="flex items-center justify-between gap-4">
            <div className="">
              <p>Trading Bot Alpha</p>
              <p className="text-xs font-mono text-grey-300">0x4a21...8f3c</p>
            </div>
            <p className="text-[10px] bg-yellow-500/10 rounded-full text-yellow-500 px-3 py-1 uppercase">
              Setting
            </p>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="">
                <p className="text-grey-200">Balance</p>
                <p className="font-mono text-[16px] font-medium">$1,500</p>
              </div>
              <div className="">
                <p className="text-grey-200">Operations</p>
                <p className="font-mono text-[16px] font-medium">56</p>
              </div>
            </div>
          </div>
          <div className="text-xs bg-primary/7 p-3 flex items-center justify-between gap-4 mt-3">
            <p>Gas saved</p>
            <p className="text-primary font-mono font-medium">+$0.067</p>
          </div>
        </div>
      </div>
    </div>
  )
}
