export default function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`habit-card ${className ?? ''}`} onClick={onClick}>
      {children}
    </div>
  );
}
