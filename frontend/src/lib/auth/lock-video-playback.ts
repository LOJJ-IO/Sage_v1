/** Split clips from lock.webm — never play the full source in the UI. */
const LOCK_FAIL_SRC = "/lock-fail.webm";
const LOCK_SUCCESS_SRC = "/lock-success.webm";

/** Fail stops at 0.7s; success plays lock-success.webm (0.7s→2.7s of source). */
export const LOCK_SPLIT_SECONDS = 0.7;
export const LOCK_SUCCESS_END_SECONDS = 2.7;

let playbackToken = 0;

function cancelPlayback() {
  playbackToken += 1;
  return playbackToken;
}

function isActive(token: number) {
  return token === playbackToken;
}

function waitForEvent(
  video: HTMLVideoElement,
  event: keyof HTMLMediaElementEventMap
) {
  return new Promise<void>((resolve) => {
    const onEvent = () => {
      video.removeEventListener(event, onEvent);
      resolve();
    };
    video.addEventListener(event, onEvent);
  });
}

async function waitForReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }
  await waitForEvent(video, "loadeddata");
}

function setVideoSrc(video: HTMLVideoElement, src: string) {
  video.loop = false;
  if (!video.src.includes(src)) {
    video.src = src;
    video.load();
  }
}

/** Idle: first frame of lock-fail.webm. */
export function initLockVideo(video: HTMLVideoElement) {
  setVideoSrc(video, LOCK_FAIL_SRC);
  video.pause();
  video.currentTime = 0;
}

export function resetLockVideo(video: HTMLVideoElement) {
  cancelPlayback();
  initLockVideo(video);
}

async function playOnce(video: HTMLVideoElement, src: string, token: number) {
  video.pause();
  video.loop = false;
  video.src = src;
  video.load();
  await waitForReady(video);

  if (!isActive(token)) {
    return;
  }

  await new Promise<void>((resolve) => {
    const finish = () => {
      video.pause();
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
      resolve();
    };

    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    void video.play().catch(finish);
  });
}

/** Wrong passcode: lock-fail.webm only (0.7s), hold last frame. */
export async function playLockFailClip(video: HTMLVideoElement) {
  const token = cancelPlayback();
  await playOnce(video, LOCK_FAIL_SRC, token);

  if (!isActive(token)) {
    return;
  }

  video.pause();
  if (Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = video.duration - 0.001;
  }
}

/** Correct passcode: lock-success.webm only (source 0.7s→2.7s). */
export async function playLockSuccessClip(video: HTMLVideoElement) {
  const token = cancelPlayback();
  await playOnce(video, LOCK_SUCCESS_SRC, token);
}
