import { T, textOn } from "../shared";

export default function PanelRadial({ buttons, accent, reducedMotion }) {
  const n = buttons.length;
  if (!n) return null;

  const r = 108;       // arc radius px
  const btnW = 58;     // button width
  const btnH = 52;     // regular button height
  const mainH = 58;    // main button height

  // Max halfSpread keeps end buttons within the viewport:
  // cos(θ_max)*r >= btnW/2  →  θ_max = arccos(btnW/2 / r) ≈ 72°; use 70° for safety.
  const halfSpread = n <= 1 ? 0 : Math.min(70, (n - 1) * 20);

  const pad = 14;
  const maxY = r * Math.sin(halfSpread * Math.PI / 180);
  const containerH = Math.ceil(2 * (maxY + mainH / 2 + pad));
  const containerW = Math.ceil(containerH / 2); // semicircle radius

  const transition = reducedMotion
    ? "background .15s, color .15s"
    : "transform .13s ease-out, background .15s, color .15s, border-color .15s, box-shadow .15s";

  return (
    <div className="rv-radial-panel" style={{
      position: "fixed", right: 0, top: "50%",
      transform: "translateY(-50%)",
      zIndex: 20, width: containerW, height: containerH,
    }}>
      <svg width={containerW} height={containerH}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none",
          filter: "drop-shadow(-2px 0 10px rgba(0,0,0,.09))" }}
        aria-hidden="true">
        <path
          d={`M ${containerW} 0 A ${containerW} ${containerW} 0 0 0 ${containerW} ${containerH} Z`}
          fill={T.panel} stroke={T.line} strokeWidth="1.5"
        />
      </svg>

      {buttons.map((btn, i) => {
        const angle = n === 1 ? 0 : -halfSpread + i * (halfSpread * 2 / (n - 1));
        const rad = angle * Math.PI / 180;
        const cx = containerW - r * Math.cos(rad);
        const cy = containerH / 2 + r * Math.sin(rad);
        const isMain = !!btn.isMain;
        const w = isMain ? btnW + 4 : btnW;
        const h = isMain ? mainH : btnH;

        return (
          <button
            key={btn.label}
            onClick={btn.onClick}
            title={btn.label}
            style={{
              position: "absolute", left: cx, top: cy,
              transform: "translate(-50%, -50%)",
              width: w, height: h,
              borderRadius: isMain ? 20 : 14,
              border: isMain ? "none" : `1.5px solid ${T.line}`,
              background: isMain ? accent : T.bg,
              color: isMain ? textOn(accent) : T.dim,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              boxShadow: isMain ? `0 3px 14px ${accent}55` : "0 1px 4px rgba(0,0,0,.08)",
              transition, zIndex: 1,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              if (!reducedMotion) el.style.transform = "translate(-50%, -50%) scale(1.12)";
              if (isMain) {
                el.style.boxShadow = `0 5px 20px ${accent}77`;
              } else {
                el.style.background = `${accent}1A`;
                el.style.borderColor = accent;
                el.style.color = accent;
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              if (!reducedMotion) el.style.transform = "translate(-50%, -50%) scale(1)";
              if (isMain) {
                el.style.boxShadow = `0 3px 14px ${accent}55`;
              } else {
                el.style.background = T.bg;
                el.style.borderColor = T.line;
                el.style.color = T.dim;
              }
            }}
            onMouseDown={e => {
              if (!reducedMotion) e.currentTarget.style.transform = "translate(-50%, -50%) scale(0.94)";
            }}
            onMouseUp={e => {
              if (!reducedMotion) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
            }}
          >
            <span style={{ fontSize: isMain ? 22 : 19, lineHeight: 1 }}>{btn.ico}</span>
            <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1.1,
              maxWidth: "90%", textAlign: "center", overflow: "hidden",
              whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {btn.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
