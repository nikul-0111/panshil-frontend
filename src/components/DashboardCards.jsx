import { memo } from 'react';
import './DashboardCards.css';

const DashboardCards = memo(({ summary = {} }) => {
  const totalMembers = summary.totalMembers !== undefined ? summary.totalMembers : 0;
  const totalVillages = summary.totalVillages !== undefined ? summary.totalVillages : 0;

  return (
    <div className="dashboard-cards-grid">
      {/* Card 1: Total Members */}
      <div className="dashboard-card status-card-blue">
        <div className="card-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="card-info-content">
          <span className="card-label-text">કુલ સભ્યો</span>
          <h3 className="card-value-heading">{totalMembers.toLocaleString('gu-IN')}</h3>
        </div>
      </div>

      {/* Card 2: Total Villages */}
      <div className="dashboard-card status-card-green">
        <div className="card-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="card-info-content">
          <span className="card-label-text">કુલ ગામો</span>
          <h3 className="card-value-heading">{totalVillages.toLocaleString('gu-IN')}</h3>
        </div>
      </div>
    </div>
  );
});

export default DashboardCards;