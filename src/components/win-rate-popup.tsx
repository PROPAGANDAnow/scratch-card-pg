"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const WinRatePopup = () => {
  return (
    <div
      className="absolute z-50"
      style={{ left: "50%", transform: "translateX(-50%)" }}
    >
      <motion.div
        className="w-[250px] border border-white/10 rounded-[48px] bg-[#0B071366] backdrop-blur py-2 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.08, ease: "linear", type: "tween" }}
        style={{ willChange: "opacity" }}
      >
        <p className="text-[16px] font-medium text-white leading-[90%] text-center">
          Win Rates
        </p>
        <div className="w-full">
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/no-win-icon.svg"}
                  alt="no-win-icon"
                  width={15}
                  height={15}
                  style={{
                    filter:
                      "drop-shadow(1px 1px 0px #E2000033) drop-shadow(0px 0px 3.91px #E20000) drop-shadow(0px 0px 7.82px #E20000) drop-shadow(0px 0px 27.38px #E20000) drop-shadow(0px 0px 54.76px #E20000) drop-shadow(0px 0px 93.88px #E20000) drop-shadow(0px 0px 164.29px #E20000)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $0
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              5%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/free-win-icon.svg"}
                  alt="free-win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(1px 1px 0px #7727DE33) drop-shadow(0px 0px 3.91px #7727DE) drop-shadow(0px 0px 7.82px #7727DE) drop-shadow(0px 0px 27.38px #7727DE) drop-shadow(0px 0px 54.76px #7727DE) drop-shadow(0px 0px 93.88px #7727DE) drop-shadow(0px 0px 164.29px #7727DE)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                Free Card
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              25%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/win-icon.svg"}
                  alt="win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #00A34F) drop-shadow(0px 0px 7.82px #00A34F) drop-shadow(0px 0px 27.38px #00A34F) drop-shadow(0px 0px 54.76px #00A34F) drop-shadow(0px 0px 93.88px #00A34F) drop-shadow(0px 0px 164.29px #00A34F)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $0.25
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              20%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/win-icon.svg"}
                  alt="win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #00A34F) drop-shadow(0px 0px 7.82px #00A34F) drop-shadow(0px 0px 27.38px #00A34F) drop-shadow(0px 0px 54.76px #00A34F) drop-shadow(0px 0px 93.88px #00A34F) drop-shadow(0px 0px 164.29px #00A34F)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $0.5
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              25%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/win-icon.svg"}
                  alt="win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #00A34F) drop-shadow(0px 0px 7.82px #00A34F) drop-shadow(0px 0px 27.38px #00A34F) drop-shadow(0px 0px 54.76px #00A34F) drop-shadow(0px 0px 93.88px #00A34F) drop-shadow(0px 0px 164.29px #00A34F)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $0.75
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              12%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/win-icon.svg"}
                  alt="win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #00A34F) drop-shadow(0px 0px 7.82px #00A34F) drop-shadow(0px 0px 27.38px #00A34F) drop-shadow(0px 0px 54.76px #00A34F) drop-shadow(0px 0px 93.88px #00A34F) drop-shadow(0px 0px 164.29px #00A34F)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $2
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              8%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/win-icon.svg"}
                  alt="win-icon"
                  width={22.35}
                  height={13.5}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #00A34F) drop-shadow(0px 0px 7.82px #00A34F) drop-shadow(0px 0px 27.38px #00A34F) drop-shadow(0px 0px 54.76px #00A34F) drop-shadow(0px 0px 93.88px #00A34F) drop-shadow(0px 0px 164.29px #00A34F)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $5
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              3%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/25-win-icon.svg"}
                  alt="25-win-icon"
                  width={21}
                  height={21}
                  style={{
                    filter:
                      "drop-shadow(1px 1px 0px #7727DE33) drop-shadow(0px 0px 3.91px #7727DE) drop-shadow(0px 0px 7.82px #7727DE) drop-shadow(0px 0px 27.38px #7727DE) drop-shadow(0px 0px 54.76px #7727DE) drop-shadow(0px 0px 93.88px #7727DE) drop-shadow(0px 0px 164.29px #7727DE)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $25
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              0.35%
            </p>
          </div>
          <div className="flex items-center justify-between w-full p-2">
            <div className="flex items-center gap-1">
              <div className="w-[24px] h-[24px] flex items-center justify-center">
                <Image
                  src={"/assets/100-win-icon.svg"}
                  alt="100-win-icon"
                  width={21}
                  height={20.25}
                  style={{
                    filter:
                      "drop-shadow(0px 0px 3.91px #A38800) drop-shadow(0px 0px 7.82px #A38800) drop-shadow(0px 0px 27.38px #A38800) drop-shadow(0px 0px 54.76px #A38800) drop-shadow(0px 0px 93.88px #A38800) drop-shadow(0px 0px 164.29px #A38800)",
                  }}
                />
              </div>
              <p className="text-[16px] font-medium text-white leading-[90%]">
                $100
              </p>
            </div>
            <p className="text-[16px] font-medium text-white leading-[90%]">
              0.03%
            </p>
          </div>
        </div>
        <p className="text-[12px] font-normal text-white/80 leading-[90%] text-center">
          Win rates are dynamic and
          <br />
          may change over time.
        </p>
      </motion.div>
    </div>
  );
};

export default WinRatePopup;
