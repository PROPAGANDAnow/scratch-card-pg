"use client";
import Image from "next/image";
import {
  APP_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  INITIAL_SCREEN_KEY,
} from "~/lib/constants";
import { FC } from "react";
import { useAppStore } from "~/stores/app-store";
import { motion } from "framer-motion";
import { setInLocalStorage } from "~/lib/utils";

const InitialScreen: FC<{ onScratchNow: () => void }> = ({ onScratchNow }) => {
  const appBackground = useAppStore((s) => s.appBackground);

  const textShadowStyle = {
    textShadow: `1px 1px 0px #7727DE33,

0px 0px 3.91px #7727DE,

0px 0px 7.82px #7727DE,

0px 0px 27.38px #7727DE,

0px 0px 54.76px #7727DE,

0px 0px 93.88px #7727DE,

0px 0px 164.29px #7727DE
`,
  };

  return (
    <div
      className="h-[100dvh] relative w-full max-w-[400px] mx-auto"
      style={{ background: appBackground }}
    >
      <Image
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        src="/assets/scratch-card-image.png"
        alt="Revealed card"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          objectFit: "cover",
          borderRadius: 4,
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
          willChange: "transform",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) translateZ(0)",
        }}
      />
      <motion.div
        className="fixed inset-0 z-[9999] text-white flex flex-col items-center justify-center py-6 px-4"
        style={{
          pointerEvents: "auto",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        <div className="w-full grow flex items-center justify-center">
          <p
            className="relative top-[48px] text-[46px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%] rotate-[-6deg]"
            style={textShadowStyle}
          >
            Welcome to
            <br />
            Scratch-Off
          </p>
        </div>
        <div className="w-full flex-shrink-0 flex flex-col gap-4 items-center justify-center">
          <p className="text-white text-[20px] leading-[120%] text-center font-semibold">
            Experience crypto the easy way:
            <br />
            scratch cards, simple and fun.
          </p>
          <div className="w-full p-1 rounded-[40px] border border-white">
            <button
              onClick={() => {
                setInLocalStorage(INITIAL_SCREEN_KEY, true);
                onScratchNow();
              }}
              className="w-full py-2 bg-white rounded-[40px] font-semibold text-[14px] h-11 transition-colors"
              style={{
                color: APP_COLORS.DEFAULT,
              }}
            >
              Scratch now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InitialScreen;
