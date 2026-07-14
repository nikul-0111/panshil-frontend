import "./Sidebar.css";

function Sidebar({ tab, setTab, onLogout, mobileOpen, setMobileOpen }) {
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

  const menuItems = isAdmin
    ? [
        {
          id: "profile",
          icon: "👤",
          label: "મારી પ્રોફાઇલ",
        },
        {
          id: "member_approvals",
          icon: "🔔",
          label: "સભ્ય મંજૂરી",
        },
        {
          id: "members",
          icon: "👥",
          label: "સભ્યોની યાદી",
        },
        {
          id: "villages",
          icon: "🏘",
          label: "ગામો",
        },
        {
          id: "payment",
          icon: "💳",
          label: "ચુકવણી",
        },
      ]
    : [
        {
          id: "profile",
          icon: "👤",
          label: "મારી પ્રોફાઇલ",
        },
        {
          id: "community",
          icon: "🌍",
          label: "સમાજ માહિતી",
        },
        {
          id: "members",
          icon: "👥",
          label: "સભ્યો",
        },
        {
          id: "villages",
          icon: "🏘",
          label: "ગામો",
        },
        {
          id: "payment",
          icon: "💳",
          label: "ચુકવણી",
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
          <h2>પંચશીલ સમાજ</h2>
          <span className="sidebar-tag">{isAdmin ? "એડમિન પોર્ટલ" : "સભ્ય પોર્ટલ"}</span>
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
            className="logout-btn"
            onClick={onLogout}
          >
            🚪 બહાર નીકળો
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;