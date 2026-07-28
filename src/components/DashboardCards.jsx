import { memo } from 'react';
import './DashboardCards.css';

const DashboardCards = memo(({ profile = {}, summary = {}, payment = {} }) => {
  const totalMembers = summary.totalMembers !== undefined ? summary.totalMembers : (payment.totalMembers || 0);
  const totalVillages = summary.totalVillages !== undefined ? summary.totalVillages : 0;
  const isAdmin = profile?.role === 'admin';
  
  const analytics = payment.analytics || {};
  const paidUsersCount = analytics.paidUsersCount || 0;
  const pendingUsersCount = analytics.pendingUsersCount !== undefined ? analytics.pendingUsersCount : Math.max(0, totalMembers - paidUsersCount);
  const totalCollectedAmount = analytics.totalCollectedAmount !== undefined ? analytics.totalCollectedAmount : (paidUsersCount * 50);
  const remainingPendingAmount = analytics.remainingPendingAmount !== undefined ? analytics.remainingPendingAmount : (pendingUsersCount * 50);
  const progressPercentage = analytics.progressPercentage !== undefined ? analytics.progressPercentage : (totalMembers > 0 ? Math.round((paidUsersCount / totalMembers) * 100) : 0);

  return (
    <div className="dashboard-cards-grid" style={{ gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(260px, 1fr))' }}>
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
          <span className="card-label-text">👥 કુલ નોંધાયેલ સભ્યો</span>
          <h3 className="card-value-heading">{totalMembers.toLocaleString('gu-IN')} સભ્યો</h3>
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
          <span className="card-label-text">🏘 જોડાયેલા ગામો</span>
          <h3 className="card-value-heading">{totalVillages.toLocaleString('gu-IN')} ગામ</h3>
        </div>
      </div>

      {/* Admin Only Financial Cards */}
      {isAdmin && (
        <>
          {/* Card 3: Amount Collected & Paid Users Count */}
          <div className="dashboard-card status-card-green" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div className="card-icon-wrap" style={{ background: '#dcfce7', color: '#166534' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="card-info-content">
              <span className="card-label-text" style={{ color: '#166534' }}>🟢 એકત્રિત રકમ ({paidUsersCount} ચૂકવેલ સભ્યો)</span>
              <h3 className="card-value-heading" style={{ color: '#15803d' }}>₹{totalCollectedAmount.toLocaleString('gu-IN')}</h3>
              <div style={{ marginTop: '6px', background: '#dcfce7', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercentage}%`, background: '#22c55e', height: '100%', transition: 'width 0.4s' }}></div>
              </div>
            </div>
          </div>

          {/* Card 4: Remaining Pending Amount & Pending Users Count */}
          <div className="dashboard-card status-card-red" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
            <div className="card-icon-wrap" style={{ background: '#fee2e2', color: '#991b1b' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="card-info-content">
              <span className="card-label-text" style={{ color: '#991b1b' }}>🔴 બાકી રકમ ({pendingUsersCount} બાકી સભ્યો)</span>
              <h3 className="card-value-heading" style={{ color: '#dc2626' }}>₹{remainingPendingAmount.toLocaleString('gu-IN')}</h3>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default DashboardCards;