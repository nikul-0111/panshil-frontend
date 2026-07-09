import "./Topbar.css";

function Topbar({
  profile,
  mobileOpen,
  setMobileOpen,
}) {
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
      🙏 સ્વાગત છે, <span>{profile?.name || "સભ્ય"}</span>
    </h2>

    
  </div>

  <div></div>
</header>
  );
}

export default Topbar;