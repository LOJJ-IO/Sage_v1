"use client";

import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react";
import { initLockVideo } from "@/lib/auth/lock-video-playback";

/** Isolated from sign-in form state so error/pin updates never re-render the video element. */
export const LockIconVideo = memo(
  forwardRef<HTMLVideoElement>(function LockIconVideo(_props, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      initLockVideo(video);
    }, []);

    return (
      <video
        ref={videoRef}
        aria-hidden="true"
        className="mb-3 size-16 object-contain"
        loop={false}
        muted
        playsInline
        preload="auto"
      />
    );
  })
);
