// Dark construction-site backdrop (cranes + half-built towers) with glow blobs so the glass panels have something to blur.
export default function Background() {
  const towers = [[30,300,90],[140,260,120],[290,320,80],[420,240,140],[620,290,100],[760,250,130],[930,310,90],[1060,270,120],[1200,300,100],[1330,250,130]];
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#0c2352] via-[#081a3d] to-[#050d1c]" aria-hidden>
      <div className="absolute -top-24 left-1/4 w-[34rem] h-[34rem] rounded-full bg-blue-500/25 blur-3xl" />
      <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-bv-yellow/10 blur-3xl" />
      <svg className="absolute bottom-0 w-full h-[75%] opacity-40" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" fill="#061230" stroke="#0f2a5e">
        {towers.map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={400 - y} />
            {Array.from({ length: Math.floor((400 - y) / 28) }).map((_, r) => <line key={r} x1={x} x2={x + w} y1={y + r * 28} y2={y + r * 28} />)}
          </g>
        ))}
        {[220, 700, 1130].map((x) => (
          <g key={x} strokeWidth="3" fill="none" stroke="#14336f">
            <path d={`M${x} 400V40M${x - 20} 40H${x + 180}M${x} 40L${x + 60} 10L${x + 120} 40M${x + 160} 40V110`} />
          </g>
        ))}
      </svg>
    </div>
  );
}
