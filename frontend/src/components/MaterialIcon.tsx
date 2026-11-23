type MaterialIconProps = {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
};

export function MaterialIcon({ name, className = "", size = 24, filled = false }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined leading-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}