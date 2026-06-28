// Empire Engine brand mark — circular medallion with 5-tower skyline crown.
// Inspired by the reference image: gold ring (top 270°), teal arc (bottom 90°),
// gold towers with highlight, teal base, circuit node.
// Pass uid per usage site to keep SVG gradient/filter IDs unique in the DOM.

interface Props {
  size: number;
  uid?: string;
}

export default function EmpireLogo({ size, uid = 'ee' }: Props) {
  const G = uid;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {/* Tower fill: dark amber at base → bright gold → cream at peak */}
        <linearGradient id={`${G}-tg`} gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="42">
          <stop offset="0%"   stopColor="#B87A0A"/>
          <stop offset="40%"  stopColor="#F5C842"/>
          <stop offset="100%" stopColor="#FFF4A3"/>
        </linearGradient>

        {/* Tower highlight: left-edge bevel */}
        <linearGradient id={`${G}-th`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="white" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>

        {/* Gold outer ring gradient: bright at top, deepens at sides */}
        <linearGradient id={`${G}-rg`} gradientUnits="userSpaceOnUse" x1="100" y1="14" x2="100" y2="186">
          <stop offset="0%"   stopColor="#FFF4A3"/>
          <stop offset="45%"  stopColor="#F5C842"/>
          <stop offset="100%" stopColor="#C8890A"/>
        </linearGradient>

        {/* Teal ring gradient for bottom arc */}
        <linearGradient id={`${G}-tr`} gradientUnits="userSpaceOnUse" x1="100" y1="155" x2="100" y2="190">
          <stop offset="0%"   stopColor="#4ECDC4"/>
          <stop offset="100%" stopColor="#1E8A83"/>
        </linearGradient>

        {/* Teal base fill inside bottom of disc */}
        <linearGradient id={`${G}-tb`} gradientUnits="userSpaceOnUse" x1="100" y1="150" x2="100" y2="185">
          <stop offset="0%"   stopColor="#2A9D8F" stopOpacity="0.92"/>
          <stop offset="100%" stopColor="#0C3D3A" stopOpacity="1"/>
        </linearGradient>

        {/* Inner atmosphere glow — teal emanating from bottom */}
        <radialGradient id={`${G}-ia`} cx="50%" cy="85%" r="38%">
          <stop offset="0%"   stopColor="#4ECDC4" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0"/>
        </radialGradient>

        {/* Clip towers + base to the inner disc */}
        <clipPath id={`${G}-cc`}>
          <circle cx="100" cy="100" r="80"/>
        </clipPath>

        {/* Gold glow filter for tower group */}
        <filter id={`${G}-gf`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* === BASE DISC === */}
      <circle cx="100" cy="100" r="93" fill="#04080F"/>
      <circle cx="100" cy="100" r="90" fill="#060C1A"/>

      {/* Teal base fill — clipped to inner circle, anchored to bottom */}
      <rect x="16" y="150" width="168" height="40"
            fill={`url(#${G}-tb)`}
            clipPath={`url(#${G}-cc)`}/>

      {/* Teal atmosphere glow inside disc */}
      <circle cx="100" cy="100" r="80" fill={`url(#${G}-ia)`}/>

      {/* === TOWERS (drawn before ring so ring overlaps their tops cleanly) === */}
      <g filter={`url(#${G}-gf)`} clipPath={`url(#${G}-cc)`}>
        {/* T1 — far left, short */}
        <rect x="53"  y="97"  width="13" height="53" rx="1.5" fill={`url(#${G}-tg)`}/>
        <rect x="53"  y="97"  width="4"  height="53" rx="1.5" fill={`url(#${G}-th)`}/>

        {/* T2 — left-center, medium */}
        <rect x="69"  y="73"  width="15" height="77" rx="1.5" fill={`url(#${G}-tg)`}/>
        <rect x="69"  y="73"  width="5"  height="77" rx="1.5" fill={`url(#${G}-th)`}/>

        {/* T3 — center, tallest (slight left of center for dynamism) */}
        <rect x="87"  y="46"  width="20" height="104" rx="2" fill={`url(#${G}-tg)`}/>
        <rect x="87"  y="46"  width="6"  height="104" rx="2" fill={`url(#${G}-th)`}/>

        {/* T4 — right-center, medium */}
        <rect x="111" y="79"  width="14" height="71" rx="1.5" fill={`url(#${G}-tg)`}/>
        <rect x="111" y="79"  width="4"  height="71" rx="1.5" fill={`url(#${G}-th)`}/>

        {/* T5 — far right, short */}
        <rect x="129" y="104" width="12" height="46" rx="1.5" fill={`url(#${G}-tg)`}/>
        <rect x="129" y="104" width="4"  height="46" rx="1.5" fill={`url(#${G}-th)`}/>
      </g>

      {/* === GOLD OUTER RING — top 270° arc (large arc, counterclockwise in SVG) ===
           Arc endpoints at ±45° below horizontal: (39,161) and (161,161)
           Both at radius ≈ 86 from center. */}
      <path
        d="M 39,161 A 86,86 0 1,0 161,161"
        fill="none"
        stroke={`url(#${G}-rg)`}
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* === TEAL BOTTOM ARC — bottom 90° (small arc, clockwise) === */}
      <path
        d="M 39,161 A 86,86 0 0,1 161,161"
        fill="none"
        stroke={`url(#${G}-tr)`}
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* === CIRCUIT NODE at tower base === */}
      {/* Horizontal spokes */}
      <line x1="60"  y1="150" x2="140" y2="150" stroke="#2A9D8F" strokeWidth="1.5" opacity="0.65"/>
      {/* Vertical down-stem */}
      <line x1="100" y1="150" x2="100" y2="160" stroke="#2A9D8F" strokeWidth="1.5" opacity="0.55"/>
      {/* Diagonal corner branches */}
      <line x1="62"  y1="150" x2="56"  y2="144" stroke="#2A9D8F" strokeWidth="1" opacity="0.4"/>
      <line x1="138" y1="150" x2="144" y2="144" stroke="#2A9D8F" strokeWidth="1" opacity="0.4"/>
      {/* Side junction nodes */}
      <circle cx="75"  cy="150" r="2.5" fill="#4ECDC4" opacity="0.85"/>
      <circle cx="125" cy="150" r="2.5" fill="#4ECDC4" opacity="0.85"/>
      {/* Main center node */}
      <circle cx="100" cy="150" r="5.5" fill="#F5C842" stroke="#2A9D8F" strokeWidth="1.5"/>
      <circle cx="100" cy="150" r="2.5" fill="#FFF8D0"/>

      {/* Subtle inner ring accent */}
      <circle cx="100" cy="100" r="72" fill="none" stroke="#F5C842" strokeWidth="0.4" opacity="0.12"/>
    </svg>
  );
}
