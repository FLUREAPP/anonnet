"use client"

import React, { useId, useMemo } from "react"

function mapEaseToCSS(ease: any): string {
    if (Array.isArray(ease) && ease.length === 4) {
        return `cubic-bezier(${ease.join(",")})`
    }
    switch (ease) {
        case "linear": return "linear"
        case "easeIn": return "ease-in"
        case "easeOut": return "ease-out"
        case "easeInOut": return "ease-in-out"
        case "circIn": return "cubic-bezier(0.6, 0.04, 0.98, 0.335)"
        case "circOut": return "cubic-bezier(0.075, 0.82, 0.165, 1)"
        case "circInOut": return "cubic-bezier(0.785, 0.135, 0.15, 0.86)"
        case "backIn": return "cubic-bezier(0.6, -0.28, 0.735, 0.045)"
        case "backOut": return "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        case "backInOut": return "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
        default: return "ease-in-out"
    }
}

function __OriginkitBase_TextMorph(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const { words, transition, tag } = props

    const morph = Math.max(0.1, transition?.duration ?? 1)
    const hold = Math.max(0, transition?.delay ?? 1)
    const easeCurve: string = transition?.ease ?? "easeInOut"
    const easeCSS = mapEaseToCSS(easeCurve)

    const Tag = (tag ?? "div") as any

    const wordList = useMemo<string[]>(
        () =>
            (words as string)
                .split(/\r?\n|,/)
                .map((w) => w.trim())
                .filter(Boolean),
        [words]
    )

    const rawId = useId()
    const safeId = rawId.replace(/[:]/g, "")
    const animName = `tm-rot-${safeId}`

    const count = Math.max(1, wordList.length)
    const slot = morph + hold
    const cycle = slot * count
    const pct = (s: number) => Math.min(100, (s / cycle) * 100).toFixed(4)
    const mIn = pct(morph) 
    const mHold = pct(morph + hold) 
    const mOut = pct(2 * morph + hold) 

    // Animasi transisi yang bersih, tajam, dan elegan tanpa distorsi blob
    const keyframes = `
@keyframes ${animName} {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(10px) scale(0.95);
  }
  ${mIn}% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0px) scale(1);
  }
  ${mHold}% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0px) scale(1);
  }
  ${mOut}%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-10px) scale(1.05);
  }
}
`

    const longest = wordList.reduce(
        (acc, w) => (w.length > acc.length ? w : acc),
        ""
    )

    return (
        <Tag
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "visible",
                userSelect: "none",
            }}
        >
            <style>{keyframes}</style>

            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        lineHeight: 1.2,
                        minHeight: "1.2em",
                    }}
                >
                    {/* Anchor tak terlihat untuk menjaga ukuran layout agar tidak bergeser */}
                    <span
                        style={{
                            visibility: "hidden",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                            fontSize: "26px",
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                        }}
                    >
                        {longest || " "}
                    </span>

                    {wordList.map((word, i) => (
                        <span
                            key={`${word}-${i}`}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                opacity: 0,
                                whiteSpace: "nowrap",
                                animation: `${animName} ${cycle}s ${(slot * i).toFixed(3)}s infinite ${easeCSS}`,
                                willChange: "opacity, transform",
                                
                                // --- EFEK HOLOGRAPHIC HD & SHARP 3D ---
                                fontSize: "26px",
                                fontWeight: 800,
                                fontFamily: "system-ui, -apple-system, sans-serif",
                                letterSpacing: "0.12em",
                                
                                // Gradien Hologram Pelangi Mengkilap (Cyan, Ungu Neon, Magenta, Putih)
                                backgroundImage: "linear-gradient(180deg, #ffffff 0%, #a5f3fc 35%, #818cf8 70%, #f472b6 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                
                                // Efek Glow & 3D Depth yang tajam dan mewah
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                                textShadow: `
                                    0 0 12px rgba(103, 232, 249, 0.7),
                                    0 0 25px rgba(129, 140, 248, 0.5),
                                    0 2px 1px rgba(255, 255, 255, 0.9)
                                `,
                            }}
                        >
                            {word}
                        </span>
                    ))}
                </div>
            </div>
        </Tag>
    )
}

const COMPONENT_DEFAULTS = {
    words: "ANONNECT, RAHASIA, AMAN",
    transition: {
        type: "tween",
        duration: 0.8,
        delay: 1.2,
        ease: "easeInOut",
    },
    tag: "div",
}

const __originkitPresetProps = {
  "words": "ANONNECT, RAHASIA, AMAN",
  "transition": {
    "mass": 1,
    "type": "spring",
    "delay": 2.5,
    "damping": 60,
    "stiffness": 800
  },
}

export default function TextMorph(props: Record<string, unknown>) {
  return <__OriginkitBase_TextMorph {...(__originkitPresetProps as Record<string, unknown>)} {...props} />;
}