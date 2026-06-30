import React, { useState, useEffect, useRef } from "react";
import { getCDNUrl } from "../utils/cdn";

export default function LazyVideoThumbnail({ src, className, style }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Preloads the video thumbnail slightly before it enters the viewport
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cdnUrl = getCDNUrl(src);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
        backgroundColor: "#121212",
        ...style
      }}
    >
      {shouldLoad && cdnUrl ? (
        <video
          muted
          preload="metadata"
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            position: "absolute",
            top: 0,
            left: 0
          }}
        >
          <source src={`${cdnUrl}#t=0.1`} type="video/mp4" />
        </video>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(45deg, #1c1c1c 25%, #2a2a2a 50%, #1c1c1c 75%)",
            backgroundSize: "200% 200%",
            animation: "lazy-skeleton-loading 1.5s infinite linear",
            position: "absolute",
            top: 0,
            left: 0
          }}
        />
      )}
      <style>{`
        @keyframes lazy-skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
