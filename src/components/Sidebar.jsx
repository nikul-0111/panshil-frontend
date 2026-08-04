import "./Sidebar.css";

function Sidebar({ tab, setTab, onLogout, mobileOpen, setMobileOpen, language = "gu" }) {
  const storedUser = localStorage.getItem("user");
  let isAdmin = false;
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      isAdmin = user.role === "admin";
    } catch (e) {
      console.error(e);
    }
  }

  const isEn = language === "en";

  const menuItems = isAdmin
    ? [
        {
          id: "profile",
          icon: "👤",
          label: isEn ? "My Profile" : "મારી પ્રોફાઇલ",
        },
        {
          id: "family",
          icon: "👨‍👩‍👧‍👦",
          label: isEn ? "My Family" : "મારી ફેમિલી",
        },
        {
          id: "member_approvals",
          icon: "🔔",
          label: isEn ? "Member Approvals" : "સભ્ય મંજૂરી",
        },
        {
          id: "family_approvals",
          icon: "👨‍👩‍👧‍👦",
          label: isEn ? "Family Approvals" : "ફેમિલી મંજૂરીઓ",
        },
        {
          id: "family_directory",
          icon: "👨‍👩‍👧‍👦",
          label: isEn ? "Family Directory" : "કૌટુંબિક ડાયરેક્ટરી",
        },
        {
          id: "members",
          icon: "👥",
          label: isEn ? "Members List" : "સભ્યોની યાદી",
        },
        {
          id: "villages",
          icon: "🏘",
          label: isEn ? "Villages" : "ગામો",
        },
        {
          id: "community",
          icon: "🌍",
          label: isEn ? "Community Info" : "સમાજ માહિતી",
        },
        {
          id: "add_death_event",
          icon: "➕",
          label: isEn ? "Add Death Record" : "મરણ નોંધ ઉમેરો",
        },
        {
          id: "death_reports",
          icon: "📊",
          label: isEn ? "Fund Reports" : "સહાય ફંડ રિપોર્ટ",
        },
        {
          id: "payment",
          icon: "💳",
          label: isEn ? "Payment" : "ચુકવણી",
        },
      ]
    : [
        {
          id: "profile",
          icon: "👤",
          label: isEn ? "My Profile" : "મારી પ્રોફાઇલ",
        },
        {
          id: "family",
          icon: "👨‍👩‍👧‍👦",
          label: isEn ? "My Family" : "મારી ફેમિલી",
        },
        {
          id: "community",
          icon: "🌍",
          label: isEn ? "Community Info" : "સમાજ માહિતી",
        },
        {
          id: "payment",
          icon: "💳",
          label: isEn ? "Payment" : "ચુકવણી",
        },
      ];

  const handleClick = (id) => {
    setTab(id);

    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>{isEn ? "Panchshil Community" : "પંચશીલ સમાજ"}</h2>
          <span className="sidebar-tag">{isAdmin ? (isEn ? "Admin Portal" : "એડમિન પોર્ટલ") : (isEn ? "Member Portal" : "સભ્ય પોર્ટલ")}</span>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-btn ${
                tab === item.id ? "active" : ""
              }`}
              onClick={() => handleClick(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`settings-footer-btn ${
              tab === "settings" ? "active" : ""
            }`}
            onClick={() => handleClick("settings")}
          >
            <span>⚙️</span>
            <span>{isEn ? "Settings" : "સેટિંગ્સ"}</span>
          </button>

          <button
            className="logout-btn"
            onClick={onLogout}
          >
            🚪 {isEn ? "Logout" : "બહાર નીકળો"}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;