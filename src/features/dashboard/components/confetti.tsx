"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface ConfettiBackgroundProps {
  className?: string
  children?: React.ReactNode
  /** Number of confetti particles */
  count?: number
  /** Confetti colors */
  colors?: string[]
  /** Gravity strength */
  gravity?: number
  /** Wind drift */
  wind?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  swayOffset: number
  swaySpeed: number
  color: string
  width: number
  height: number
  opacity: number
}

const DEFAULT_COLORS = [
  "rgba(244, 114, 182, 0.8)", // pink
  "rgba(192, 132, 252, 0.8)", // purple
  "rgba(129, 140, 248, 0.8)", // indigo
  "rgba(96, 165, 250, 0.8)", // blue
  "rgba(45, 212, 191, 0.8)", // teal
  "rgba(251, 191, 36, 0.7)", // amber
  "rgba(248, 113, 113, 0.7)", // red
]

export function ConfettiBackground({
  className,
  children,
  count = 25,
  colors = DEFAULT_COLORS,
  gravity = 0.03,
  wind = 0.005,
}: ConfettiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    let width = rect.width
    let height = rect.height
    canvas.width = width
    canvas.height = height

    let animationId: number
    let tick = 0

    // Create particles
    const createParticle = (startFromTop = true): Particle => ({
      x: Math.random() * width,
      y: startFromTop ? -20 - Math.random() * 200 : Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.3 + 0.2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.8,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.008 + 0.004,
      color: colors[Math.floor(Math.random() * colors.length)],
      width: Math.random() * 10 + 8,
      height: Math.random() * 5 + 4,
      opacity: Math.random() * 0.3 + 0.5,
    })

    const particles: Particle[] = Array.from({ length: count }, () => createParticle(false))

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width
      canvas.height = height
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(container)

    // Animation
    const animate = () => {
      tick++
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        // Physics
        p.vy += gravity
        p.vx += wind
        p.x += p.vx + Math.sin(tick * p.swaySpeed + p.swayOffset) * 0.3
        p.y += p.vy
        p.rotation += p.rotationSpeed

        // Fade near bottom
        const fadeStart = height * 0.7
        if (p.y > fadeStart) {
          p.opacity = Math.max(0, 0.5 * (1 - (p.y - fadeStart) / (height * 0.3)))
        }

        // Draw
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 2)
        ctx.fill()
        ctx.restore()

        // Respawn if off screen
        if (p.y > height + 50) {
          Object.assign(p, createParticle(true))
          p.opacity = Math.random() * 0.3 + 0.5
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
    }
  }, [count, colors, gravity, wind])

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Subtle ambient gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(120, 119, 198, 0.15) 0%, transparent 60%)",
        }}
      />


      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}

