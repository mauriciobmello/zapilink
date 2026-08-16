import Image from "next/image";

const RATIO = 1214 / 326;

interface LogoProps {
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function Logo({
  height = 32,
  className,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/logo-zapilink.png"
      alt="ZAPILINK"
      width={Math.round(height * RATIO)}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
