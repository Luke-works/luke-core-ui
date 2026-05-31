interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = '',
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-100 dark:bg-white/[0.05] ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
      }}
    />
  );
}
