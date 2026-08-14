// 3D Stagger Flip — Sleek & Premium Holographic Edition
"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useAnimate, type AnimationOptions } from "framer-motion";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
};

type StaggerFrom = "first" | "last" | "center" | "random";
type RotateDirection = "top" | "right" | "bottom" | "left";
type AnimationTrigger = "hover" | "enter";
type TextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "div" | "section";
type TransitionValue = AnimationOptions;

type Text3DFlipProps = {
  text?: string;
  font?: FontStyle;
  color?: string;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  animation?: AnimationTrigger;
  tag?: TextTag;
  transition?: TransitionValue;
  rotateDirection?: RotateDirection;
  style?: React.CSSProperties;
};

type WordPart = {
  characters: string[];
  needsSpace: boolean;
};

type CharBoxProps = {
  char: string;
  color: string;
  flipColor: string;
  rotateDirection: RotateDirection;
};

const HAS_SEGMENTER = typeof Intl !== "undefined" && "Segmenter" in Intl;

const splitIntoCharacters = (text: string): string[] => {
  if (HAS_SEGMENTER) {
    const segmenter = new (Intl as any).Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }: any) => segment);
  }
  return Array.from(text);
};

const SECOND_FACE_TRANSFORMS = {
  top: "rotateX(-90deg) translateZ(0.5lh)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)",
  bottom: "rotateX(90deg) translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)",
} as const;

const FRONT_FACE_TRANSFORMS = {
  top: "translateZ(0.5lh)",
  bottom: "translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(-90deg) translateX(50%) rotateY(90deg)",
} as const;

const CONTAINER_TRANSFORMS = {
  top: "translateZ(-0.5lh) rotateX(0deg)",
  bottom: "translateZ(-0.5lh) rotateX(0deg)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)",
} as const;

const FLIPPED_TRANSFORMS = {
  top: "translateZ(-0.5lh) rotateX(90deg)",
  bottom: "translateZ(-0.5lh) rotateX(-90deg)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(-90deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)",
} as const;

const holographicCharStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #a5f3fc 40%, #38bdf8 80%, #818cf8 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 2px 8px rgba(56, 189, 248, 0.4))",
};

const CharBox = memo(({ char, rotateDirection }: CharBoxProps) => (
  <span className="text-3d-flip-char" style={{ display: "inline-block", transformStyle: "preserve-3d" as const, transform: CONTAINER_TRANSFORMS[rotateDirection], WebkitTransform: CONTAINER_TRANSFORMS[rotateDirection] }}>
    <span style={{ position: "relative", display: "block", height: "1lh", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: FRONT_FACE_TRANSFORMS[rotateDirection], WebkitTransform: FRONT_FACE_TRANSFORMS[rotateDirection], ...holographicCharStyle }}>
      {char}
    </span>
    <span style={{ position: "absolute", top: 0, left: 0, display: "block", height: "1lh", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: SECOND_FACE_TRANSFORMS[rotateDirection], WebkitTransform: SECOND_FACE_TRANSFORMS[rotateDirection], ...holographicCharStyle }}>
      {char}
    </span>
  </span>
));
CharBox.displayName = "CharBox";

function __OriginkitBase_Text3DFlip(props: Text3DFlipProps) {
  const { text = "ANONNECT", font = {}, color = "#FFFFFF", staggerDuration = 0.05, staggerFrom = "first", animation = "hover", tag = "p", transition = { type: "spring", damping: 30, stiffness: 300, mass: 1 }, rotateDirection = "top", style } = props;
  const content = text || "ANONNECT";
  const [scope, animate] = useAnimate();
  const restingTransform = CONTAINER_TRANSFORMS[rotateDirection];
  const flippedTransform = FLIPPED_TRANSFORMS[rotateDirection];

  const characters = useMemo(() => content.split(" ").map((word) => ({ characters: splitIntoCharacters(word), needsSpace: true })), [content]);
  const getStaggerDelay = useCallback((index: number, totalChars: number) => {
    if (staggerFrom === "first") return index * staggerDuration;
    if (staggerFrom === "last") return (totalChars - 1 - index) * staggerDuration;
    return Math.random() * (totalChars * staggerDuration);
  }, [staggerDuration, staggerFrom]);

  const playAnimation = useCallback(async () => {
    const totalChars = characters.reduce((sum, word) => sum + word.characters.length, 0);
    const delays = Array.from({ length: totalChars }, (_, i) => getStaggerDelay(i, totalChars));
    await animate(".text-3d-flip-char", { transform: flippedTransform }, { ...transition, delay: (i: number) => delays[i] ?? 0 } as any);
    await animate(".text-3d-flip-char", { transform: restingTransform }, { duration: 0, delay: 0 });
  }, [animate, characters, flippedTransform, getStaggerDelay, restingTransform, transition]);

  return (
    <div onPointerEnter={animation === "hover" ? playAnimation : undefined} style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');`}</style>
      {React.createElement(tag, { ref: scope, style: { ...font, display: "flex", flexWrap: "wrap", justifyContent: "center", perspective: 800, color } }, 
        characters.map((wordObject, wI) => (
          <span key={wI} style={{ display: "inline-flex", transformStyle: "preserve-3d" as const }}>
            {wordObject.characters.map((char, cI) => <CharBox key={cI} char={char} color={color} flipColor={color} rotateDirection={rotateDirection} />)}
          </span>
        ))
      )}
    </div>
  );
}

export default function Text3DFlip(props: any) {
  return <__OriginkitBase_Text3DFlip text="ANONNECT" font={{ fontSize: "26px", fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }} {...props} />;
}