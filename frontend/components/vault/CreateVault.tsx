"use client"
import React, { useState } from 'react'
import { Input, Modal, Steps, StepsProps } from 'antd'
import { Button } from 'antd'
import { ArrowUpRight } from 'lucide-react'
import gsap from "gsap"
import ScrambleTextPlugin from "gsap/ScrambleTextPlugin"
gsap.registerPlugin(ScrambleTextPlugin)

const percentages = [25, 50, 75, 100]
const allowed_chains = ["Arc", "Ethereum", "Abitrium", "Optimism", "Base", "Polygon"]

export const CreateVault = () => {
  const [openModal, setOpenModal] = useState(false)
  const toggleModal = () => setOpenModal(!openModal)
  const [current, setCurrent] = useState(0)
  const onChange = (value: number) => {
    console.log('onChange:', value)
    setCurrent(value)
  }
  const props: StepsProps = {
    type: 'panel',
    current,
    onChange,
    items: [
      {
        title: <p className={current === 0 ? 'text-grey-1000' : ""}>Deposit USDC</p>,
      },
      {
        title: <p className={current === 1 ? 'text-grey-1000' : ""}>Policies</p>,
        disabled: true,

      },
      {
        title: <p className={current === 2 ? 'text-grey-1000' : ""}>Vault Created</p>,
        disabled: true,

      },
    ],
  }
  return (
    <div>
      <Button
        onClick={toggleModal}
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
        icon={<ArrowUpRight className='connect-wallet-arrow' />} iconPlacement="end"
        className='!h-[45px] w-[200px] uppercase text-xs! font-medium! border-grey-700! hover:border-primary!'>
        <span className='connect-wallet-text'>Connect wallet</span>
      </Button>

      <Modal
        forceRender
        open={openModal}
        onCancel={toggleModal}
        centered
        footer={null}
        closeIcon={null}
        width={530}
        styles={{
          container: { padding: 0, borderRadius: "12px" },
          mask: { backdropFilter: "blur(12px)" },
        }}>
        <div className="bg-grey-900 p-4 md:p-5 font-sans">
          <div className="mb-7">
            <h3 className='uppercase text-lg font-medium'>Create vault</h3>
            <p className="text-xs font-mono text-grey-300">Deposit USDC and set up your agent spending policies</p>
          </div>
          <Steps {...props} />
          <div className="mt-4">
            {
              current === 0 && <div>
                {/* <p className='font-mono pb-3 text-xs'>This will be your agent's operating budget on Arc</p> */}
                <div className="border-primary/0 border-[1px] bg-grey-1000 p-4 text-xs mb-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <p className='text-sm font-medium'>Available Balance</p>
                    <p className="font-mono text-sm">12,000.78 USDC</p>
                  </div>
                  <Input className='rounded-none! h-10 border-primary! bg-grey-800!' placeholder='0.00' suffix="USDC" type={"number"} />
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {
                      percentages.map((percent, index) => {
                        return <div key={index}
                          className='flex items-center justify-center bg-grey-900 h-10 border-primary/10 border cursor-pointer hover:border-primary' role='button'>{percent === 100 ? "Max" : percent}</div>
                      })
                    }
                  </div>
                </div>

                <Button className='w-full h-10.25!' type='primary' onClick={() => {
                  setCurrent(1)
                }}>Continue</Button>
              </div>
            }

            {
              current === 1 && <div>
                {/* <p className='font-mono pb-3 text-xs'>This will be your agent's operating budget on Arc</p> */}
                <div className="border-primary/0 border-[1px] bg-grey-1000 p-4 text-xs mb-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <p className="font-mono text-sm text-grey-300">Set global limits that apply to all agents
                      {/* (can override per-agent) */}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="">
                      <p className="text-xs font-mono mb-1">Default daily limit</p>
                      <Input className='rounded-none! h-10 border-primary! bg-grey-800!' />
                    </div>
                    <div className="">
                      <p className="text-xs font-mono mb-1">Default Max Per Transaction</p>
                      <Input className='rounded-none! h-10 border-primary! bg-grey-800!' />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {
                      allowed_chains.map((chain, index) => {
                        return <div key={index}
                          className='flex items-center justify-center bg-grey-900 h-10 border-primary/10 border cursor-pointer hover:border-primary' role='button'>{chain}</div>
                      })
                    }
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button className='w-full h-10.25!' onClick={() => {
                    setCurrent(0)
                  }}>Back</Button>
                  <Button className='w-full h-10.25! col-span-2' type='primary' onClick={() => {
                    setCurrent(2)
                  }}>Continue</Button>
                </div>
              </div>
            }

            {
              current === 2 && <div className="flex flex-col items-center">
                {/* Celebration Icon */}
                <div className="w-16 h-16 rounded-full bg-[#1a3a3a] flex items-center justify-center mb-6">
                  <span className="text-3xl">🎉</span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-primary mb-2">Vault Created!</h2>

                {/* Subtitle */}
                <p className="text-grey-300 text-sm font-mono text-center mb-8">
                  Your vault is ready. Now let's authorize your first AI agent.
                </p>

                {/* Details Section */}
                <div className="w-full border-t border-grey-700 pt-4 space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Vault Address</span>
                    <span className="text-primary font-mono text-sm">0x8f3a...d4e1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Initial Deposit</span>
                    <span className="text-primary font-mono text-sm">USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Network</span>
                    <span className="text-primary font-mono text-sm">Arc Testnet</span>
                  </div>
                </div>

                {/* Dashboard Button */}
                <Button
                  className='w-full h-12!'
                  type='primary'
                  onClick={() => {
                    toggleModal()
                    setCurrent(0)
                  }}
                >
                  Go to Dashboard
                </Button>
              </div>
            }
          </div>
        </div>
      </Modal>
    </div>
  )
}
