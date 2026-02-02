"use client"
import { ActiveStateChannels } from "@/components/sessions/ActiveStateChannels"
import { GasSavingBanner } from "@/components/sessions/GasSavingBanner"
import React from "react"

const SessionsPage = () => {
  return (
    <div>
      <div className="">
        <GasSavingBanner />
      </div>

      <div className="grid grid-cols-1 gap-4 md: md:grid-cols-5 my-4 md:my-7">
        <ActiveStateChannels />
        <div className="col-span-4"></div>
      </div>
    </div>
  )
}

export default SessionsPage
