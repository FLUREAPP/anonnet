// ... (Bagian atas kode Bos tetap sama)

  return (
    <div
      onPointerEnter={animation === "hover" ? handlePointerEnter : undefined}
      onPointerLeave={animation === "hover" ? handlePointerLeave : undefined}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
      `}</style>
      {React.createElement(
        tag,
        {
          ref: scope,
          "aria-label": content,
          style: {
            ...font,
            position: "relative",
            margin: 0,
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            justifyContent,
            perspective: 800,
            perspectiveOrigin: "center center",
            cursor: animation === "hover" ? "pointer" : undefined,
            userSelect: "none",
            WebkitUserSelect: "none",
            color,
          },
        },
        characters.map((wordObject, wordIndex) => (
          <span
            key={wordIndex}
            aria-hidden="true"
            style={{
              display: "inline-flex",
              transformStyle: "preserve-3d",
            }}
          >
            {wordObject.characters.map((char, charIndex) => (
              <CharBox
                key={charOffsets[wordIndex]! + charIndex}
                char={char}
                color={color}
                flipColor={color}
                rotateDirection={rotateDirection}
              />
            ))}
            {wordObject.needsSpace ? (
              <span style={{ whiteSpace: "pre" }}> </span>
            ) : null}
          </span>
        ))
      )}
    </div>
  );
} // <--- Pastikan kurung ini menutup function __OriginkitBase_Text3DFlip

Text3DFlip.displayName = "Text3DFlip";

// ... (Sisa kode presetProps dan export default di bawahnya)