interface IncidentOverlayProps {
  count: number;
}

export default function IncidentOverlay({ count }: IncidentOverlayProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white"
      style={{
        width: 20,
        height: 20,
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: '#ef4444',
      }}
      title={`${count} incident${count !== 1 ? 's' : ''}`}
    >
      {count > 1 ? count : '\u26A0'}
    </span>
  );
}
