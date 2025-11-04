import * as React from "react";

export function BouncingBallIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <ellipse cx="12" cy="5" rx="4" ry="4"><animate id="SVG2g6X4cnm" attributeName="cy" begin="0;SVGYUW1Wdmy.end" calcMode="spline" dur="0.375s" keySplines=".33,0,.66,.33" values="5;20"/><animate attributeName="rx" begin="SVG2g6X4cnm.end" calcMode="spline" dur="0.05s" keySplines=".33,0,.66,.33;.33,.66,.66,1" values="4;4.8;4"/><animate attributeName="ry" begin="SVG2g6X4cnm.end" calcMode="spline" dur="0.05s" keySplines=".33,0,.66,.33;.33,.66,.66,1" values="4;3;4"/><animate id="SVGb9s1Jd3o" attributeName="cy" begin="SVG2g6X4cnm.end" calcMode="spline" dur="0.025s" keySplines=".33,0,.66,.33" values="20;20.5"/><animate id="SVGYUW1Wdmy" attributeName="cy" begin="SVGb9s1Jd3o.end" calcMode="spline" dur="0.4s" keySplines=".33,.66,.66,1" values="20.5;5"/></ellipse>
    </svg>
  );
}
