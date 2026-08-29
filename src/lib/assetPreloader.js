import { useState, useEffect } from "react";

// In-memory cache for preloaded video Blob URLs and Image instances
const videoBlobCache = new Map();
const imageCache = new Set();

/**
 * Preloads an image into the browser cache.
 */
export function preloadImage(src) {
  if (!src) return Promise.resolve(true);
  if (imageCache.has(src)) return Promise.resolve(true);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve(true);
    };
    img.onerror = () => {
      // Don't fail the whole session if one image fails
      resolve(false);
    };
    img.src = src;
    if (img.complete) {
      imageCache.add(src);
      resolve(true);
    }
  });
}

/**
 * Preloads a video using fetch -> blob URL so the entire video data is in RAM.
 * Falls back to HTMLVideoElement buffering if fetch fails (e.g. CORS/offline).
 */
export function preloadVideo(src) {
  if (!src) return Promise.resolve(true);
  if (videoBlobCache.has(src)) return Promise.resolve(true);

  return new Promise((resolve) => {
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        videoBlobCache.set(src, blobUrl);
        resolve(true);
      })
      .catch(() => {
        // Fallback to video element preloading
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        let finished = false;

        const onDone = () => {
          if (!finished) {
            finished = true;
            videoBlobCache.set(src, src);
            resolve(true);
          }
        };

        video.addEventListener("canplaythrough", onDone, { once: true });
        video.addEventListener("canplay", onDone, { once: true });
        video.addEventListener("loadeddata", onDone, { once: true });
        video.addEventListener("error", onDone, { once: true });
        video.src = src;
        video.load();

        // Safety fallback after 6s
        setTimeout(onDone, 6000);
      });
  });
}

/**
 * Retrieves the cached blob URL if available, otherwise returns the original src.
 */
export function getPreloadedVideoSrc(src) {
  return videoBlobCache.get(src) || src;
}

/**
 * Checks if a specific video source has finished preloading.
 */
export function isVideoPreloaded(src) {
  return videoBlobCache.has(src);
}

/**
 * Hook to track loading progress of a batch of assets.
 * Returns { progress: number (0-1), isThresholdMet: boolean, isAllLoaded: boolean }
 */
export function useAssetPreloader(assets = [], threshold = 0.5) {
  const [loadedCount, setLoadedCount] = useState(0);
  const total = assets.length;

  useEffect(() => {
    if (total === 0) {
      setLoadedCount(1);
      return;
    }

    let isMounted = true;
    let count = 0;

    const onAssetLoaded = () => {
      if (!isMounted) return;
      count += 1;
      setLoadedCount(count);
    };

    assets.forEach((asset) => {
      if (!asset) {
        onAssetLoaded();
        return;
      }
      const isVideo =
        typeof asset === "string" &&
        (asset.endsWith(".webm") || asset.endsWith(".mp4") || asset.includes("video"));

      if (isVideo) {
        preloadVideo(asset).then(onAssetLoaded);
      } else {
        preloadImage(asset).then(onAssetLoaded);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [assets, total]);

  const progress = total > 0 ? loadedCount / total : 1;
  const isThresholdMet = progress >= threshold;
  const isAllLoaded = progress >= 1;

  return { progress, isThresholdMet, isAllLoaded };
}

/**
 * Hook specifically for the Gain XP video & assets preloader.
 */
export function useGainXpPreloader(videoSrc) {
  const [isReady, setIsReady] = useState(() => isVideoPreloaded(videoSrc));

  useEffect(() => {
    if (!videoSrc) {
      setIsReady(true);
      return;
    }

    if (isVideoPreloaded(videoSrc)) {
      setIsReady(true);
      return;
    }

    let isMounted = true;
    preloadVideo(videoSrc).then(() => {
      if (isMounted) {
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [videoSrc]);

  return { isReady, preloadedSrc: getPreloadedVideoSrc(videoSrc) };
}
