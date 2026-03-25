import './Skeleton.css';

export function SkeletonLine({ width = '100%', height = 14 }) {
  return <div className="skeleton-line" style={{ width, height }} />;
}

export function SkeletonCircle({ size = 40 }) {
  return <div className="skeleton-circle" style={{ width: size, height: size }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="skeleton-card card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <SkeletonLine width="60%" height={18} />
        <SkeletonLine width="80px" height={24} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={`${90 - i * 15}%`} height={13} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="skeleton-card stat-card">
      <SkeletonCircle size={40} />
      <SkeletonLine width="60px" height={30} />
      <SkeletonLine width="80px" height={12} />
    </div>
  );
}

export function SkeletonPage({ cards = 4, stats = 4 }) {
  return (
    <div className="page">
      <SkeletonLine width="200px" height={26} />
      <div className="grid-4" style={{ margin: '24px 0' }}>
        {Array.from({ length: stats }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
