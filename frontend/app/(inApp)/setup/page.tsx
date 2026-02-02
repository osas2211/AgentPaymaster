"use client"
import { Button } from 'antd'
import { ArrowUpRight } from 'lucide-react'
import React from 'react'
import gsap from "gsap"
import ScrambleTextPlugin from "gsap/ScrambleTextPlugin"

gsap.registerPlugin(ScrambleTextPlugin)


const steps = [
  "Approve USDC spending for PolicyVault contract", "Deposit USDC into your vault",
  "Agents can now open gasless sessions via Yellow Network", "Monitor spending in real-time on your dashboard"
]

const SetupPage = () => {
  return (
    <div className='md:py-[5rem]'>
      <div className="">
        <small className='text-xs text-primary'>PHASE 1 / SETUP</small>
        <h3 className="text-7xl uppercase my-4">setup secure vault</h3>
        <p className='max-w-[700px] text-grey-400 mt-7 mb-10'>Deposit USDC to enable agent operations. Agents spend from this pool
          within your policy limits. You can withdraw available funds anytime.</p>
      </div>
      <div className='max-w-[900px] p-4 md:p-6 border-grey-800 border-[1px] flex items-center justify-between gap-4 flex-wrap'>
        <div className="">
          <p className='uppercase'>wallet connection</p>
          <div className="text-sm text-grey-300 font-medium mt-2">Not connected</div>
        </div>
        <Button
          onMouseEnter={() => {
            gsap.fromTo(
              `.connect-wallet-text`,
              { scrambleText: "@#$%^** **$%^&" },
              { scrambleText: "Connect wallet", duration: 0.5 }
            )

            gsap.to(".connect-wallet-arrow", {
              rotate: "45deg",
              duration: 0.5

            })
          }}
          onMouseLeave={() => {
            gsap.to(".connect-wallet-arrow", {
              rotate: "0deg",
            })
          }}
          icon={<ArrowUpRight className='connect-wallet-arrow' />} iconPlacement="end" className='!h-[45px] w-[200px] uppercase text-xs! font-medium! border-grey-700! hover:border-primary!'>
          <span className='connect-wallet-text'>Connect wallet</span>
        </Button>
      </div>

      <div className="max-w-[900px] p-4 md:p-7 border-primary/50 border-[1px] md:mt-12 bg-primary/5">
        <small className='text-xs text-primary uppercase font-medium'>What happens next?</small>
        <div className="mt-4">
          <div className="space-y-3">
            {
              steps.map((step, index) => {
                return <div className="flex items-center gap-4" key={index}>
                  <p className='text-primary font-medium'>0{index + 1}</p>
                  <p className='text-grey-100'>{step}</p>
                </div>
              })
            }
            <p className="text-sm text-grey-300 py-2">You'll sign two transactions (approve + deposit). Your agents can now
              execute operations with 99.9% gas savings.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetupPage