
import { useState } from "react";
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

  return (
    <header className="navbar">
      <button
        type="button"
        className="brand"
        onClick={() => navigate("/")}
      >
        <span className="brand-icon">🏡</span>
        <span>PANCHSHIL</span>
      </button>

      {/* Mobile Menu Button */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <div className={`nav-menu ${menuOpen ? "active" : ""}`}>
        <nav className="nav-links">
          {navLinks.map((link) => (
            <button
              key={link.label}
              className={`nav-link-btn ${
                currentPage === link.href ? "active" : ""
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
  );
}

export default Navbar;