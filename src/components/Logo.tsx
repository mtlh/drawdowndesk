interface LogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const dimensions = {
    sm: 28,
    md: 36,
    lg: 48
  }
  const svgSize = dimensions[size]
  
  return (
    <svg 
      width={svgSize} 
      height={svgSize}
      viewBox="0 0 56 56" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8D089" />
          <stop offset="50%" stopColor="#C9A962" />
          <stop offset="100%" stopColor="#A68B4B" />
        </linearGradient>
        <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a5c45" />
          <stop offset="100%" stopColor="#0B3D2C" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="52" height="52" rx="12" fill="url(#logoGreen)" stroke="url(#logoGold)" strokeWidth="1.5" />
      <path d="M12 40L16 28L22 32L28 18L36 26L44 16" stroke="url(#logoGold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="28" r="3" fill="url(#logoGold)" />
      <circle cx="22" cy="32" r="3" fill="url(#logoGold)" />
      <circle cx="28" cy="18" r="3" fill="url(#logoGold)" />
      <circle cx="36" cy="26" r="3" fill="url(#logoGold)" />
      <circle cx="44" cy="16" r="3" fill="#E8D089" />
    </svg>
  )
}
