interface TokenOverlayProps {
  count: number;
}

export default function TokenOverlay({ count }: TokenOverlayProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white"
      style={{
        width: 20,
        height: 20,
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: '#f97316',
        animation: 'bpmn-token-pulse 2s ease-in-out infinite',
      }}
    >
      {count}
    </span>
  );
}
