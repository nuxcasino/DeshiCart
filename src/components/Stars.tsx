export default function Stars({
  rating,
  size = 14,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill =
          rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="shrink-0"
          >
            <defs>
              <linearGradient id={`half-${i}-${size}`}>
                <stop offset="50%" stopColor="#c8963e" />
                <stop offset="50%" stopColor="#e2d8c8" />
              </linearGradient>
            </defs>
            <path
              d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9 2.9-6z"
              fill={
                fill === 1
                  ? "#c8963e"
                  : fill === 0.5
                  ? `url(#half-${i}-${size})`
                  : "#e2d8c8"
              }
            />
          </svg>
        );
      })}
    </span>
  );
}
