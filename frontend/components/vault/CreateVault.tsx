"use client"

import React, { useState, useEffect } from "react"
import { Input, Modal, Steps, StepsProps, Spin } from "antd"
import { Button } from "antd"
import { ArrowUpRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import ScrambleTextPlugin from "gsap/ScrambleTextPlugin"

import { useWallet } from "@/lib/hooks/useWallet"
import { useCreateVault } from "@/lib/hooks/useCreateVault"
import { useVaultBalance } from "@/lib/hooks/useVaultBalance"
import { formatUSDC, parseUSDC, isValidUSDCInput, formatAddress } from "@/lib/utils/format"
import { POLICY_VAULT_ADDRESS } from "@/lib/contracts/addresses"

gsap.registerPlugin(ScrambleTextPlugin)

const percentages = [25, 50, 75, 100]

export const CreateVault = () => {
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wallet connection
  const {
    isConnected,
    isConnecting,
    connect: openWalletModal,
    usdcBalance,
    isBalanceLoading,
  } = useWallet()

  // Vault creation flow
  const {
    currentStep,
    setCurrentStep,
    depositAmount,
    setDepositAmount,
    setAmountByPercentage,
    executeDeposit,
    needsApproval,
    completePolicies,
    skipPolicies,
    goBack,
    reset,
    isPending,
    isDepositConfirming,
    isDepositSuccess,
  } = useCreateVault()

  // Vault balance (to show in success screen)
  const { balance: vaultBalance } = useVaultBalance()

  // Policy form state
  const [dailyLimit, setDailyLimit] = useState("")
  const [maxPerTx, setMaxPerTx] = useState("")

  // Map hook steps to UI steps
  const stepMap = { deposit: 0, policies: 1, complete: 2 }
  const current = stepMap[currentStep]

  const toggleModal = () => {
    if (openModal) {
      // Reset state when closing
      reset()
      setError(null)
      setDailyLimit("")
      setMaxPerTx("")
    }
    setOpenModal(!openModal)
  }

  const handleButtonClick = () => {
    if (!isConnected) {
      openWalletModal()
    } else {
      toggleModal()
    }
  }

  // Handle deposit
  const handleDeposit = async () => {
    setError(null)

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter an amount to deposit")
      return
    }

    const amount = parseUSDC(depositAmount)

    if (usdcBalance && amount > usdcBalance) {
      setError("Insufficient USDC balance")
      return
    }

    await executeDeposit(amount, {
      onError: (err) => {
        setError(err.message || "Deposit failed")
      },
    })
  }

  // Handle input change with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (isValidUSDCInput(value)) {
      setDepositAmount(value)
      setError(null)
    }
  }

  // Handle percentage click
  const handlePercentageClick = (percent: number) => {
    setAmountByPercentage(percent)
    setError(null)
  }

  // Steps configuration
  const stepsProps: StepsProps = {
    type: "panel",
    current,
    items: [
      {
        title: (
          <p className={current === 0 ? "text-grey-1000" : ""}>Deposit USDC</p>
        ),
      },
      {
        title: (
          <p className={current === 1 ? "text-grey-1000" : ""}>Policies</p>
        ),
        disabled: current < 1,
      },
      {
        title: (
          <p className={current === 2 ? "text-grey-1000" : ""}>Vault Created</p>
        ),
        disabled: current < 2,
      },
    ],
  }

  // Button text based on state
  const getDepositButtonText = () => {
    if (isPending) {
      if (needsApproval(parseUSDC(depositAmount || "0"))) {
        return "Approving USDC..."
      }
      return "Depositing..."
    }
    if (isDepositConfirming) {
      return "Confirming..."
    }
    if (needsApproval(parseUSDC(depositAmount || "0"))) {
      return "Approve & Deposit"
    }
    return "Continue"
  }

  return (
    <div>
      <Button
        onClick={handleButtonClick}
        loading={isConnecting}
        onMouseEnter={() => {
          gsap.fromTo(
            `.connect-wallet-text`,
            { scrambleText: "@#$%^** **$%^&" },
            {
              scrambleText: isConnected ? "Create Vault" : "Connect wallet",
              duration: 0.5,
            }
          )
          gsap.to(".connect-wallet-arrow", {
            rotate: "45deg",
            duration: 0.5,
          })
        }}
        onMouseLeave={() => {
          gsap.to(".connect-wallet-arrow", {
            rotate: "0deg",
          })
        }}
        icon={<ArrowUpRight className="connect-wallet-arrow" />}
        iconPlacement="end"
        className="!h-[45px] w-[200px] uppercase text-xs! font-medium! border-grey-700! hover:border-primary!"
      >
        <span className="connect-wallet-text">
          {isConnected ? "Create Vault" : "Connect wallet"}
        </span>
      </Button>

      <Modal
        forceRender
        open={openModal}
        onCancel={toggleModal}
        centered
        footer={null}
        closeIcon={null}
        width={530}
        maskClosable={!isPending}
        styles={{
          container: { padding: 0, borderRadius: "12px" },
          mask: { backdropFilter: "blur(12px)" },
        }}
      >
        <div className="bg-grey-900 p-4 md:p-5 font-sans">
          <div className="mb-7">
            <h3 className="uppercase text-lg font-medium">Create vault</h3>
            <p className="text-xs font-mono text-grey-300">
              Deposit USDC and set up your agent spending policies
            </p>
          </div>

          <Steps {...stepsProps} />

          <div className="mt-4">
            {/* Step 1: Deposit */}
            {current === 0 && (
              <div>
                <div className="border-primary/0 border-[1px] bg-grey-1000 p-4 text-xs mb-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <p className="text-sm font-medium">Available Balance</p>
                    <p className="font-mono text-sm">
                      {isBalanceLoading ? (
                        <Spin size="small" />
                      ) : (
                        `${formatUSDC(usdcBalance)} USDC`
                      )}
                    </p>
                  </div>

                  <Input
                    className="rounded-none! h-10 border-primary! bg-grey-800!"
                    placeholder="0.00"
                    suffix="USDC"
                    value={depositAmount}
                    onChange={handleAmountChange}
                    disabled={isPending}
                    status={error ? "error" : undefined}
                  />

                  {/* Error message */}
                  {error && (
                    <div className="flex items-center gap-2 mt-2 text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {percentages.map((percent) => (
                      <div
                        key={percent}
                        onClick={() =>
                          !isPending && handlePercentageClick(percent)
                        }
                        className={`
                          flex items-center justify-center bg-grey-900 h-10
                          border-primary/10 border cursor-pointer hover:border-primary
                          ${isPending ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        role="button"
                      >
                        {percent === 100 ? "Max" : `${percent}%`}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-10.25!"
                  type="primary"
                  onClick={handleDeposit}
                  disabled={isPending || !depositAmount}
                  loading={isPending || isDepositConfirming}
                >
                  {getDepositButtonText()}
                </Button>
              </div>
            )}

            {/* Step 2: Policies */}
            {current === 1 && (
              <div>
                <div className="border-primary/0 border-[1px] bg-grey-1000 p-4 text-xs mb-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <p className="font-mono text-sm text-grey-300">
                      Set global limits that apply to all agents
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-mono mb-1">
                        Default daily limit (USDC)
                      </p>
                      <Input
                        className="rounded-none! h-10 border-primary! bg-grey-800!"
                        placeholder="1000.00"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-mono mb-1">
                        Default max per transaction (USDC)
                      </p>
                      <Input
                        className="rounded-none! h-10 border-primary! bg-grey-800!"
                        placeholder="100.00"
                        value={maxPerTx}
                        onChange={(e) => setMaxPerTx(e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-grey-400 mt-4">
                    You can configure these later when authorizing agents.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button className="w-full h-10.25!" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    className="w-full h-10.25!"
                    onClick={skipPolicies}
                  >
                    Skip
                  </Button>
                  <Button
                    className="w-full h-10.25!"
                    type="primary"
                    onClick={completePolicies}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {current === 2 && (
              <div className="flex flex-col items-center">
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  Vault Created!
                </h2>

                {/* Subtitle */}
                <p className="text-grey-300 text-sm font-mono text-center mb-8">
                  Your vault is ready. Now let&apos;s authorize your first AI
                  agent.
                </p>

                {/* Details Section */}
                <div className="w-full border-t border-grey-700 pt-4 space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Vault Address</span>
                    <span className="text-primary font-mono text-sm">
                      {formatAddress(POLICY_VAULT_ADDRESS, 6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Initial Deposit</span>
                    <span className="text-primary font-mono text-sm">
                      {formatUSDC(parseUSDC(depositAmount || "0"))} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Vault Balance</span>
                    <span className="text-primary font-mono text-sm">
                      {formatUSDC(vaultBalance?.total)} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-grey-300 text-sm">Network</span>
                    <span className="text-primary font-mono text-sm">
                      Arc Testnet
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full space-y-2">
                  <Button
                    className="w-full h-12!"
                    type="primary"
                    onClick={() => {
                      toggleModal()
                      router.push("/dashboard")
                    }}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    className="w-full h-10!"
                    onClick={() => {
                      reset()
                      setCurrentStep("deposit")
                    }}
                  >
                    Deposit More
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
