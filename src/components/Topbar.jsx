import "./Topbar.css";

function Topbar({
  profile,
  mobileOpen,
  setMobileOpen,
  onOpenAvatarModal,
  language = "gu"
}) {
  const isEn = language === "en";
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
    </header>
  );
}

export default Topbar;