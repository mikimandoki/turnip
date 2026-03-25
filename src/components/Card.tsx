export default function Card({
  children,
  className,
  onClick,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={`habit-card ${className ?? ''}`} onClick={onClick}>
      {children}
    </div>
  );
}
