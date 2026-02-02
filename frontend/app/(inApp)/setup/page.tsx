"use client"
import React from 'react'
import { CreateVault } from '@/components/vault/CreateVault'



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
        <p className='max-w-[700px] text-grey-400 mt-6 mb-10 font-mono text-sm'>Deposit USDC to enable agent operations. Agents spend from this pool
          within your policy limits. You can withdraw available funds anytime.</p>
      </div>
      <div className='max-w-[900px] p-4 md:p-6 md:pb-10 border-grey-800 border-[1px] flex items-center justify-between gap-4 flex-wrap'>
        <div className="">
          <p className='uppercase text-sm'>wallet connection</p>
          <div className="text-sm text-grey-400 font-medium mt-2">Not connected</div>
        </div>
        <CreateVault />
      </div>

      <div className="max-w-[900px] p-4 md:p-7 border-primary/50 border-[1px] md:mt-12 bg-primary/5 relative">
        <small className='text-xs text-primary uppercase font-medium'>What happens next?</small>
        <div className="mt-4">
          <div className="space-y-3">
            {
              steps.map((step, index) => {
                return <div className="flex items-center gap-4 font-mono text-sm" key={index}>
                  <p className='text-primary font-medium'>0{index + 1}</p>
                  <p className='text-grey-100'>{step}</p>
                </div>
              })
            }
            <p className="text-xs text-grey-300 py-2 font-mono">You'll sign two transactions (approve + deposit). Your agents can now
              execute operations with 99.9% gas savings.</p>
          </div>
        </div>

        <div className='absolute bottom-0 right-0 w-[50px] h-[2px] bg-primary' />
        <div className='absolute bottom-0 right-0 w-[2px] h-[50px] bg-primary' />

      </div>
    </div>
  )
}

export default SetupPage