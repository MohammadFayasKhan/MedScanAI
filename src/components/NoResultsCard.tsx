/**
 * MedScanAI : No Results Card
 * Empty state UI for search / OCR not found.
 */
interface Props {
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function NoResultsCard({ emoji = '🔍', title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center fade-in">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      {subtitle && <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      {action}
    </div>
  );
}
