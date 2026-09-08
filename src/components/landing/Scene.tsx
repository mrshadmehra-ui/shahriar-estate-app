import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Photo with a bright cool-tinted gradient underneath, so the layout keeps
 * its intended look even if the remote image is slow or fails to load.
 */
export function Scene({ src, alt, className, imgClassName }: SceneProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-sky-200/70 via-indigo-100/70 to-sky-50",
        className,
      )}
    >
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            imgClassName,
          )}
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-10 text-sky-300/80" />
        </div>
      )}
      {/* soft cool tint so cards feel cohesive with the theme */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-900/25 via-transparent to-white/10" />
    </div>
  );
}