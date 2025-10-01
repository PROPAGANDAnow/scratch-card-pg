// Circular progress component
export const CircularProgress = ({
  revealsToNextLevel,
  totalRevealsForLevel,
}: {
  revealsToNextLevel: number;
  totalRevealsForLevel: number;
}) => {
  const progress =
    ((totalRevealsForLevel - revealsToNextLevel) / totalRevealsForLevel) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-[16px] h-[16px]">
      <svg
        className="transform -rotate-90"
        viewBox="0 0 100 100"
        style={{
          width: "16px",
          height: "16px",
        }}
      >
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="white"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
    </div>
  );
};
