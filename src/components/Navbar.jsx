import { useState, useEffect } from "react";
import "./Navbar.css";

const navLinks = [
  { label: "હોમ", href: "/" },
  { label: "અમારા વિશે", href: "/about" },
  { label: "આ કેવી રીતે કામ કરે છે", href: "/how-it-works" },
  { label: "સંપર્ક", href: "/contact" },
];

function Navbar({ currentPage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (path) => {
    onNavigate(path);
    setMenuOpen(false);
  };

  // Automatically close sidebar if screen is resized to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  return (
    <>
      <header className="navbar">
        <button
          type="button"
          className="brand"
          onClick={() => navigate("/")}
        >
          <span className="brand-icon">🏡</span>
          <span>PANCHSHIL</span>
        </button>

        {/* Mobile Menu Button - toggles between hamburger and close icon */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-menu ${menuOpen ? "active" : ""}`}>
          <nav className="nav-links">
            {navLinks.map((link) => (
              <button
                key={link.label}
                className={`nav-link-btn ${currentPage === link.href ? "active" : ""
                  }`}
                onClick={() => navigate(link.href)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="nav-actions">
            <button
              className="nav-link-btn"
              onClick={() => navigate("/login")}
            >
              લૉગિન
            </button>

            <button
              className="nav-link-btn primary"
              onClick={() => navigate("/register")}
            >
              રજિસ્ટર
            </button>
          </div>
        </div>
      </header>

      {/* Overlay to dim background when sidebar is open on mobile */}
      <div
        className={`sidebar-overlay ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(false)}
      ></div>
    </>
  );
}

export default Navbar;
