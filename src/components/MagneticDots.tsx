"use client"

import { useEffect, useRef } from "react"

interface Dot {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  flowOffset: number
}

interface Ripple {
  x: number
  y: number
  startTime: number
  duration: number
}

interface MagneticDotsProps {
  dotSize?: number
  dotSpacing?: number
  attractionRadius?: number
  attractionStrength?: number
  springStrength?: number
  damping?: number
  dotColor?: string
  className?: string
  flowAngle?: number
  flowSpeed?: number
  flowAmplitude?: number
  rippleSpeed?: number
  rippleStrength?: number
  rippleDuration?: number
}

export function MagneticDots({
  dotSize = 2,
  dotSpacing = 15, // Reduced from 20 to 15 to add even more dots
  attractionRadius = 1000,
  attractionStrength = 300,
  springStrength = 0.003,
  damping = 0.96,
  dotColor = "rgba(100, 100, 100, 0.5)",
  className = "",
  flowAngle = 25,
  flowSpeed = 0.02,
  flowAmplitude = 15,
  rippleSpeed = 600,
  rippleStrength = 80,
  rippleDuration = 1500,
}: MagneticDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animationFrameRef = useRef<number>()
  const timeRef = useRef<number>(0)
  const isDarkRef = useRef(false)
  const ripplesRef = useRef<Ripple[]>([])

  useEffect(() => {
    const checkDarkMode = () => {
      isDarkRef.current = document.documentElement.classList.contains("dark")
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initializeDots()
    }

    const initializeDots = () => {
      const dots: Dot[] = []
      const angleRad = (flowAngle * Math.PI) / 180

      // Create angled grid by transforming coordinates
      const cols = Math.ceil((canvas.width + canvas.height * Math.abs(Math.tan(angleRad))) / dotSpacing) + 2
      const rows = Math.ceil((canvas.height + canvas.width * Math.abs(Math.tan(angleRad))) / dotSpacing) + 2

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          // Calculate angled position
          const x = i * dotSpacing - j * dotSpacing * Math.sin(angleRad)
          const y = j * dotSpacing

          // Only add dots that will be visible (with some margin)
          if (
            x > -dotSpacing * 2 &&
            x < canvas.width + dotSpacing * 2 &&
            y > -dotSpacing * 2 &&
            y < canvas.height + dotSpacing * 2
          ) {
            dots.push({
              x,
              y,
              baseX: x,
              baseY: y,
              vx: 0,
              vy: 0,
              flowOffset: (i + j) * 0.5,
            })
          }
        }
      }

      dotsRef.current = dots
    }

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    // Mouse leave handler
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    const handleClick = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        startTime: Date.now(),
        duration: rippleDuration,
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      timeRef.current += flowSpeed
      const currentTime = Date.now()

      ripplesRef.current = ripplesRef.current.filter((ripple) => currentTime - ripple.startTime < ripple.duration)

      const mouseX = mouseRef.current.x
      const mouseY = mouseRef.current.y

      // Update and draw dots
      dotsRef.current.forEach((dot) => {
        const flowX = Math.sin(timeRef.current + dot.flowOffset) * flowAmplitude
        const flowY = Math.cos(timeRef.current + dot.flowOffset * 0.7) * (flowAmplitude * 0.5)
        const targetBaseX = dot.baseX + flowX
        const targetBaseY = dot.baseY + flowY

        // Calculate distance to mouse
        const dx = mouseX - dot.x
        const dy = mouseY - dot.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < attractionRadius && distance > 0) {
          const normalizedDistance = distance / attractionRadius
          const force = (1 - normalizedDistance) * attractionStrength

          // Apply much stronger force by using 2.0 multiplier instead of 0.01
          const forceX = (dx / distance) * force * 2.0
          const forceY = (dy / distance) * force * 2.0

          dot.vx += forceX
          dot.vy += forceY
        }

        ripplesRef.current.forEach((ripple) => {
          const elapsed = currentTime - ripple.startTime
          const progress = elapsed / ripple.duration

          // Calculate distance from ripple origin
          const rdx = dot.x - ripple.x
          const rdy = dot.y - ripple.y
          const rippleDistance = Math.sqrt(rdx * rdx + rdy * rdy)

          // Calculate ripple wave position (expands outward over time)
          const rippleRadius = progress * rippleSpeed

          // Use a sine wave to create the ripple effect
          // The wave peaks when the expanding ring passes through the dot
          const distanceFromWave = Math.abs(rippleDistance - rippleRadius)
          const waveWidth = 100 // Width of the wave effect

          if (distanceFromWave < waveWidth) {
            // Calculate wave strength (peaks at wave center, fades at edges)
            const waveStrength = Math.cos((distanceFromWave / waveWidth) * Math.PI) * 0.5 + 0.5
            // Fade out over time
            const fadeFactor = 1 - progress
            const totalStrength = waveStrength * fadeFactor * rippleStrength

            // Push dot outward from ripple origin
            if (rippleDistance > 0) {
              dot.vx += (rdx / rippleDistance) * totalStrength
              dot.vy += (rdy / rippleDistance) * totalStrength
            }
          }
        })

        const springDx = targetBaseX - dot.x
        const springDy = targetBaseY - dot.y
        dot.vx += springDx * springStrength
        dot.vy += springDy * springStrength

        // Apply damping
        dot.vx *= damping
        dot.vy *= damping

        // Update position
        dot.x += dot.vx
        dot.y += dot.vy

        ctx.fillStyle = isDarkRef.current ? "rgba(255, 255, 255, 1)" : dotColor
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("click", handleClick)
    animate()

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("click", handleClick)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    dotSize,
    dotSpacing,
    attractionRadius,
    attractionStrength,
    springStrength,
    damping,
    dotColor,
    flowAngle,
    flowSpeed,
    flowAmplitude,
    rippleSpeed,
    rippleStrength,
    rippleDuration,
  ])

  return <canvas ref={canvasRef} className={`fixed inset-0 ${className}`} style={{ pointerEvents: "none" }} />
}
