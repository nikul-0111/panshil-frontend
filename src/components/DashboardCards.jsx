import { memo } from 'react';
import './DashboardCards.css';

const DashboardCards = ({ profile, summary = {}, payment = {} }) => {
  const totalMembers = summary.totalMembers !== undefined ? summary.totalMembers : 0;
  const totalVillages = summary.totalVillages !== undefined ? summary.totalVillages : 0;
  
  const activeFundName = payment.deceasedName || "શ્રી રમેશભાઈ પરમાર";
  const isPaid = payment.status === 'Paid';

  return (
    <div className="dashboard-cards">
      {/* Card 1: Total Members */}
      <div className="dashboard-card card-members">
        <div className="dashboard-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="dashboard-card-content">
          <p>કુલ સભ્યો</p>
          <h2>{totalMembers.toLocaleString('gu-IN')}</h2>
        </div>
      </div>

      {/* Card 2: Total Villages */}
      <div className="dashboard-card card-villages">
        <div className="dashboard-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="dashboard-card-content">
          <p>કુલ ગામો</p>
          <h2>{totalVillages.toLocaleString('gu-IN')}</h2>
        </div>
      </div>

      {/* Card 3: Active Fund / Deceased Person */}
      <div className="dashboard-card card-active-fund">
        <div className="dashboard-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="dashboard-card-content">
          <p>ચાલુ સહાય ફંડ (મૃત સભ્ય)</p>
          <h2 className="fund-name">{activeFundName}</h2>
        </div>
      </div>

      {/* Card 4: Payment Status */}
      <div className={`dashboard-card card-payment-status ${isPaid ? 'status-paid' : 'status-pending'}`}>
        <div className="dashboard-card-icon">
          {isPaid ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>
        <div className="dashboard-card-content">
          <p>તમારી ચુકવણી સ્થિતિ</p>
          <span className={`status-badge-card ${isPaid ? 'paid' : 'pending'}`}>
            {isPaid ? "✅ ચૂકવેલ" : "❌ બાકી"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(DashboardCards);