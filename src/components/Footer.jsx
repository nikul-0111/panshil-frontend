import "./Footer.css";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

function Footer({ onNavigate }) {
  const handleLinkClick = (e, path) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* સમાજ વિશે */}
        <div className="footer-section">
          <h2>પંચશીલ સમાજ</h2>
          <p>
            પંચશીલ સમાજના તમામ સભ્યોને એક જ ડિજિટલ પ્લેટફોર્મ પર જોડવાનો
            આ એક પ્રયાસ છે. અહીં સભ્યોની માહિતી, ગામોની વિગતો,
            સહાય ફંડ, પ્રોફાઇલ અને સમાજ સંબંધિત તમામ માહિતી સરળતાથી ઉપલબ્ધ રહેશે.
          </p>
        </div>

        {/* ઝડપી લિંક્સ */}
        <div className="footer-section">
          <h3>ઝડપી લિંક્સ</h3>
          <ul>
            <li>
              <a href="/" onClick={(e) => handleLinkClick(e, "/")}>
                🏠 હોમ
              </a>
            </li>
            <li>
              <a href="/about" onClick={(e) => handleLinkClick(e, "/about")}>
                ℹ️ અમારા વિશે
              </a>
            </li>
            
            <li>
              <a href="/contact" onClick={(e) => handleLinkClick(e, "/contact")}>
                📞 સંપર્ક કરો
              </a>
            </li>
            <li>
              <a href="/admin/login" onClick={(e) => handleLinkClick(e, "/admin/login")}>
                🛠️ એડમિન લોગિન <span className="admin-badge">Admin</span>
              </a>
            </li>
            <li>
              <a href="/admin/register" onClick={(e) => handleLinkClick(e, "/admin/register")}>
                📝 એડમિન રજીસ્ટ્રેશન <span className="admin-badge">Admin</span>
              </a>
            </li>
          </ul>
        </div>

        {/* સંપર્ક માહિતી */}
        <div className="footer-section">
          <h3>સંપર્ક માહિતી</h3>
          <p>
            <FaPhoneAlt /> +91 98765 43210
          </p>
          <p>
            <FaEnvelope /> info@panchshilcommunity.com
          </p>
          <p>
            <FaMapMarkerAlt /> ગુજરાત, ભારત
          </p>
        </div>

        {/* સોશિયલ મીડિયા */}
        <div className="footer-section">
          <h3>અમારી સાથે જોડાઓ</h3>
          <div className="social-icons">
            <a href="#" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="#" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="#" aria-label="LinkedIn">
              <FaLinkedinIn />
            </a>
          </div>
          <p style={{ marginTop: "15px" }}>
            સમાજના નવા સમાચાર અને માહિતી માટે સોશિયલ મીડિયા પર અમને અનુસરો.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} પંચશીલ સમાજ. સર્વ હકો સુરક્ષિત.
      </div>
    </footer>
  );
}

export default Footer;