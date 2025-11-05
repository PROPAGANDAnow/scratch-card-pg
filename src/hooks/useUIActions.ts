"use client";

import { useCallback, useEffect, useRef } from "react";

export const useUIActions = () => {
  // Refs for preloaded assets
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const winnerGifRef = useRef<HTMLImageElement | null>(null);

  // Initialize audio and images on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Preload audio
      winAudioRef.current = new Audio("/assets/win.mp3");
      winAudioRef.current.preload = "auto";
      winAudioRef.current.volume = 0.7; // Set volume to 70%

      // Preload winner gif
      winnerGifRef.current = new window.Image();
      winnerGifRef.current.src = "/assets/winner.gif";
    }
  }, []);


  /**
   * Plays the win sound effect
   */
  const playWinSound = useCallback(() => {
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0; // Reset to beginning
      winAudioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
      });
    }
  }, []);

  /**
   * Returns the preloaded winner GIF image
   * @returns HTMLImageElement | null
   */
  const getWinnerGif = useCallback(() => winnerGifRef.current, []);

  return {
    playWinSound,
    getWinnerGif,
  };
};