"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import {
  Bot,
  Shield,
  Zap,
  ArrowRight,
  Terminal,
  Layers,
  Brain,
  Lock,
  ChevronDown,
  Github,
  Twitter,
  ExternalLink,
} from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// ============================================
// Landing Page
// ============================================

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const architectureRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.fromTo(
        ".hero-badge",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      )
      gsap.fromTo(
        ".hero-title",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.15, ease: "power3.out" },
      )
      gsap.fromTo(
        ".hero-subtitle",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: "power3.out" },
      )
      gsap.fromTo(
        ".hero-actions",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.45, ease: "power3.out" },
      )
      gsap.fromTo(
        ".hero-terminal",
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, delay: 0.6, ease: "power3.out" },
      )

      // Feature cards stagger
      gsap.fromTo(
        ".feature-card",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 80%",
          },
        },
      )

      // Architecture flow
      gsap.fromTo(
        ".arch-step",
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: architectureRef.current,
            start: "top 75%",
          },
        },
      )

      // CTA
      gsap.fromTo(
        ".cta-block",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 85%",
          },
        },
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="bg-grey-1000 text-white min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-grey-800 bg-grey-1000/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-veneer text-lg uppercase tracking-wide">
            Agent-Paymaster
          </span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs uppercase tracking-widest text-grey-400 hover:text-white transition-colors font-mono">
              Features
            </a>
            <a href="#architecture" className="text-xs uppercase tracking-widest text-grey-400 hover:text-white transition-colors font-mono">
              How it works
            </a>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-primary text-night text-xs uppercase tracking-widest font-mono font-medium hover:bg-primary/90 transition-colors"
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-6">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(195,255,73,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(195,255,73,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-3xl">
            <div className="hero-badge inline-flex items-center gap-2 px-3 py-1.5 border border-primary/20 bg-primary/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] uppercase tracking-widest font-mono text-primary">
                Built on Yellow Network
              </span>
            </div>

            <h1 className="hero-title text-5xl md:text-7xl font-medium leading-[1.05] tracking-tight mb-6">
              AI Agents with
              <br />
              <span className="text-primary">Spending Limits</span>
            </h1>

            <p className="hero-subtitle text-lg md:text-xl text-grey-300 max-w-xl leading-relaxed mb-10 font-light">
              Give your AI agents the power to transact on-chain, controlled by
              smart-contract policies and executed gaslessly through state channels.
            </p>

            <div className="hero-actions flex items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-night text-sm font-mono font-medium uppercase tracking-wide hover:bg-primary/90 transition-colors"
              >
                Launch App
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-grey-700 text-white text-sm font-mono uppercase tracking-wide hover:border-grey-500 transition-colors"
              >
                <Terminal size={16} />
                Try Agent
              </Link>
            </div>
          </div>

          {/* Terminal Preview */}
          <div className="hero-terminal mt-16 border border-grey-700 bg-grey-1000 overflow-hidden max-w-4xl">
            <div className="px-4 py-3 bg-white/[0.02] border-b border-grey-700 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span className="text-[13px] text-grey-400 font-mono">
                agent-paymaster.log
              </span>
            </div>
            <div className="px-5 py-4 font-mono text-xs leading-relaxed space-y-2.5 h-[200px] overflow-hidden">
              <TermLine time="14:32:01" prompt="Swap 50 USDC for ETH on Uniswap" />
              <TermResponse text="> Swap 50 USDC for ~0.0156 ETH via Uniswap V3 on Ethereum" protocol="Uniswap V3" />
              <TermStatus icon="shield" text="Spend approved by PolicyVault" ok remaining="450.00" />
              <TermStatus icon="check" text="COMPLETED" ok saved="$0.45" />

              <div className="border-t border-white/[0.03] pt-2.5" />

              <TermLine time="14:32:18" prompt="Send 25 USDC to vitalik.eth" />
              <TermResponse text="> Transfer 25 USDC to 0xd8dA...6045" />
              <TermStatus icon="shield" text="Spend approved by PolicyVault" ok remaining="425.00" />
              <TermStatus icon="check" text="COMPLETED" ok saved="$0.12" />
            </div>
          </div>

          {/* Scroll hint */}
          <div className="flex justify-center mt-16">
            <ChevronDown size={20} className="text-grey-500 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={featuresRef} className="py-24 px-6 border-t border-grey-800">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-16">
            <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">
              Core Features
            </p>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
              Everything your agents need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-grey-700">
            <FeatureCard
              icon={<Brain size={20} />}
              title="Natural Language Commands"
              description="Type plain English like 'Swap 50 USDC for ETH' and Brian AI interprets it into executable Web3 transactions."
            />
            <FeatureCard
              icon={<Shield size={20} />}
              title="PolicyVault Controls"
              description="Smart-contract enforced daily limits, per-transaction caps, and protocol whitelists. Agents can only spend what you allow."
            />
            <FeatureCard
              icon={<Zap size={20} />}
              title="Gasless via Yellow Network"
              description="Transactions execute through state channels with zero gas fees. Save $0.12-$0.65 per operation compared to on-chain."
            />
            <FeatureCard
              icon={<Bot size={20} />}
              title="Multi-Agent Management"
              description="Authorize multiple AI agents with individual policies. Pause, resume, or revoke any agent in real time."
            />
            <FeatureCard
              icon={<Terminal size={20} />}
              title="Live Command Feed"
              description="Terminal-style UI shows every command as it flows through interpretation, validation, and execution."
            />
            <FeatureCard
              icon={<Lock size={20} />}
              title="Emergency Controls"
              description="One-click emergency pause freezes all agents instantly. Emergency withdraw pulls all funds back to your wallet."
            />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" ref={architectureRef} className="py-24 px-6 border-t border-grey-800">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-16">
            <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">
              Architecture
            </p>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ArchStep
              step="01"
              title="Interpret"
              description="User types a natural language command. Brian AI parses it into a structured Web3 transaction."
              icon={<Brain size={18} />}
              color="text-indigo-400"
            />
            <ArchStep
              step="02"
              title="Validate"
              description="PolicyVault smart contract checks: Is the agent authorized? Does the amount fit within daily and per-tx limits?"
              icon={<Shield size={18} />}
              color="text-primary"
            />
            <ArchStep
              step="03"
              title="Execute"
              description="Approved transactions are routed through Yellow Network state channels for gasless, instant execution."
              icon={<Zap size={18} />}
              color="text-amber-400"
            />
            <ArchStep
              step="04"
              title="Settle"
              description="State channel operations are batched and settled on-chain, saving 99% on gas while maintaining security."
              icon={<Layers size={18} />}
              color="text-violet-400"
            />
          </div>

          {/* Tech Stack */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-grey-700">
            <TechBadge label="Smart Contracts" value="Solidity" />
            <TechBadge label="State Channels" value="Yellow Network" />
            <TechBadge label="AI Interpretation" value="Brian AI" />
            <TechBadge label="Frontend" value="Next.js + Wagmi" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 px-6 border-t border-grey-800">
        <div className="cta-block max-w-[700px] mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Ready to give your agents
            <br />
            <span className="text-primary">controlled spending power?</span>
          </h2>
          <p className="text-grey-400 mb-10 font-light">
            Deploy a PolicyVault, authorize your agents, and start transacting gaslessly.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/setup"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-night text-sm font-mono font-medium uppercase tracking-wide hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 px-8 py-4 border border-grey-700 text-white text-sm font-mono uppercase tracking-wide hover:border-grey-500 transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-grey-800 py-10 px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <span className="font-veneer text-sm uppercase tracking-wide text-grey-400">
              Agent-Paymaster
            </span>
            <p className="text-[11px] text-grey-500 font-mono mt-1">
              AI Agent Spending Control with Yellow Network State Channels
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="w-9 h-9 rounded-full border border-grey-700 flex items-center justify-center text-grey-400 hover:text-white hover:border-grey-500 transition-colors">
              <Github size={14} />
            </a>
            <a href="#" className="w-9 h-9 rounded-full border border-grey-700 flex items-center justify-center text-grey-400 hover:text-white hover:border-grey-500 transition-colors">
              <Twitter size={14} />
            </a>
            <a href="#" className="w-9 h-9 rounded-full border border-grey-700 flex items-center justify-center text-grey-400 hover:text-white hover:border-grey-500 transition-colors">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="feature-card p-8 bg-grey-1000 hover:bg-grey-900 transition-colors group">
      <div className="text-primary mb-5 group-hover:scale-110 transition-transform origin-left">
        {icon}
      </div>
      <h3 className="text-sm font-medium uppercase tracking-wide mb-3">{title}</h3>
      <p className="text-xs text-grey-400 leading-relaxed">{description}</p>
    </div>
  )
}

function ArchStep({ step, title, description, icon, color }: {
  step: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="arch-step p-6 border border-grey-700 bg-grey-900 relative">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono text-grey-500">{step}</span>
        <div className={color}>{icon}</div>
      </div>
      <h3 className="text-sm font-medium uppercase tracking-wide mb-2">{title}</h3>
      <p className="text-xs text-grey-400 leading-relaxed">{description}</p>
    </div>
  )
}

function TechBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 bg-grey-1000">
      <p className="text-[10px] uppercase tracking-widest text-grey-500 font-mono mb-1.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function TermLine({ time, prompt }: { time: string; prompt: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-grey-500 min-w-[75px] shrink-0">{time}</span>
      <span className="text-primary">$</span>
      <span className="text-white">{prompt}</span>
    </div>
  )
}

function TermResponse({ text, protocol }: { text: string; protocol?: string }) {
  return (
    <div className="flex items-center gap-2 ml-[85px]">
      <span className="text-grey-300">{text}</span>
      {protocol && (
        <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">
          {protocol}
        </span>
      )}
    </div>
  )
}

function TermStatus({ icon, text, ok, remaining, saved }: {
  icon: string
  text: string
  ok?: boolean
  remaining?: string
  saved?: string
}) {
  const color = ok ? "text-primary" : "text-red-400"
  return (
    <div className="flex items-center gap-2 ml-[85px]">
      {icon === "shield" && <Shield size={10} className={color} />}
      {icon === "check" && (
        <span className={`${color} bg-primary/10 px-1.5 py-0.5 rounded text-[10px]`}>
          {text}
        </span>
      )}
      {icon === "shield" && <span className={color}>{text}</span>}
      {remaining && (
        <span className="text-grey-500 text-[10px]">(remaining: {remaining} USDC)</span>
      )}
      {saved && (
        <span className="text-primary text-[10px]">saved {saved}</span>
      )}
    </div>
  )
}
