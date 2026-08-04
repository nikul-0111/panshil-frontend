import { useState } from "react";
import "./Topbar.css";

function Topbar({
  profile,
  mobileOpen,
  setMobileOpen,
  onOpenAvatarModal,
  language = "gu",
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onOpenBroadcastModal,
}) {
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const isEn = language === "en";
  const isAdmin = profile?.role === "admin";

  const getNotifIcon = (type) => {
    switch (type) {
      case "death_event":
        return "🚨";
      case "approval":
        return "🎉";
      case "announcement":
        return "📢";
      default:
        return "ℹ️";
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diffMs = new Date() - new Date(dateStr);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return isEn ? "Just now" : "હમણાં જ";
    if (diffMins < 60) return `${diffMins} ${isEn ? "m ago" : "મિનિટ પહેલાં"}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${isEn ? "h ago" : "કલાક પહેલાં"}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${isEn ? "d ago" : "દિવસ પહેલાં"}`;
  };

  return (
    <header className="topbar">
      <button
        className="menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        ☰
      </button>

      <div className="topbar-content">
        <h2>
          🙏 {isEn ? "Welcome," : "સ્વાગત છે,"} <span>{profile?.name || (isEn ? "Member" : "સભ્ય")}</span>
        </h2>
      </div>

      <div className="topbar-right-actions">
        {/* Admin Announcement Trigger Button */}
        {isAdmin && (
          <button
            type="button"
            className="topbar-broadcast-btn"
            onClick={onOpenBroadcastModal}
            title={isEn ? "Send Announcement" : "નવી જાહેરાત મોકલો"}
          >
            📢 <span>{isEn ? "Announce" : "જાહેરાત"}</span>
          </button>
        )}

        {/* Notification Bell Button & Dropdown - Rendered ONLY when unread notifications exist */}
        {unreadCount > 0 && (
          <div className="notification-bell-container">
            <button
              type="button"
              className={`topbar-bell-btn ${unreadCount > 0 ? "has-unread" : ""} ${showNotifPopup ? "active" : ""}`}
              onClick={() => setShowNotifPopup(!showNotifPopup)}
              title={isEn ? "Notifications" : "નોટિફિકેશન"}
            >
              <span className="bell-icon-emoji">🔔</span>
              <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </button>

            {showNotifPopup && (
              <div className="notification-dropdown-overlay animate-fade-in">
                <div className="notif-dropdown-header">
                  <div className="notif-header-title">
                    <h3>🔔 {isEn ? "Notifications" : "નોટિફિકેશન"}</h3>
                    <span className="unread-tag">{unreadCount} {isEn ? "new" : "નવી"}</span>
                  </div>
                  <button
                    type="button"
                    className="mark-read-btn"
                    onClick={() => {
                      onMarkAllRead?.();
                    }}
                  >
                    ✓ {isEn ? "Mark read" : "વાંચેલી ગણો"}
                  </button>
                </div>

                <div className="notif-dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty-state">
                      <div className="notif-empty-icon">🔕</div>
                      <p>{isEn ? "No notifications available" : "કોઈ નવી નોટિફિકેશન નથી"}</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`notif-item-card ${
                          !notif.readBy?.includes(profile?._id || profile?.id) ? "unread" : ""
                        }`}
                      >
                        <div className="notif-icon-col">
                          {getNotifIcon(notif.type)}
                        </div>
                        <div className="notif-content-col">
                          <h4>{notif.title}</h4>
                          <p>{notif.message}</p>
                          <span className="notif-time">{formatTimeAgo(notif.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avatar Profile Picture */}
        <div 
          className="topbar-avatar-wrapper"
          onClick={onOpenAvatarModal}
          title="પ્રોફાઇલ ફોટો બદલો"
        >
          {profile?.avatar ? (
            <img src={profile.avatar} alt="Profile" className="topbar-avatar-img" />
          ) : (
            <div className="topbar-avatar-placeholder">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;