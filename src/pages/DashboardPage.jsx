import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardCards from "../components/DashboardCards";
import { transliterateEnglishToGujarati } from "../utils/translator";
import "../styles/Dashboard.css";

function DashboardPage({ onNavigate }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({});
  const [summary, setSummary] = useState({});
  const [members, setMembers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [payment, setPayment] = useState({});
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Profile Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", village: "", age: "", email: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("ચુકવણી કરવા માટે કૃપા કરીને લોગિન કરો.");
        onNavigate("/login");
        return;
      }

      // 1. Create order on the backend
      const orderRes = await fetch("/api/community/payment/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        alert("ઓર્ડર બનાવવામાં નિષ્ફળતા: " + (orderData.message || "અજ્ઞાત ભૂલ"));
        return;
      }

      const { orderId, amount, currency, keyId } = orderData.data;

      // 2. Load Razorpay SDK Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("રેઝરપે SDK લોડ કરવામાં નિષ્ફળ. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસો.");
        return;
      }

      // 3. Configure Razorpay Options
      const options = {
        key: keyId,
        amount,
        currency,
        name: "Panchshil Community Fund",
        description: `સહાય ફંડ ચૂકવણી - ${payment.deceasedName || "શ્રી રમેશભાઈ પરમાર"}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // 4. Verify Payment on Backend
            const verifyRes = await fetch("/api/community/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("ચુકવણી સફળતાપૂર્વક પૂર્ણ થઈ ગઈ છે!");
              setRefreshTrigger((prev) => prev + 1);
            } else {
              alert("ચુકવણી ચકાસણી નિષ્ફળ ગઈ: " + (verifyData.message || "અજ્ઞાત ભૂલ"));
            }
          } catch (err) {
            console.error(err);
            alert("ચુકવણી ચકાસણી દરમિયાન કોઈ ભૂલ આવી.");
          }
        },
        prefill: {
          name: profile.name || "",
          contact: profile.mobile || "",
          email: profile.email || "",
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      alert("ચુકવણી પ્રક્રિયા શરૂ કરવામાં કોઈ ભૂલ આવી.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      onNavigate("/login");
      return;
    }

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setProfile(JSON.parse(storedUser));
      } catch (err) {
        console.error(err);
        setProfile({});
      }
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    fetch("/api/community/summary", { headers })
      .then((res) => res.json())
      .then((data) => setSummary(data.data || {}))
      .catch(console.error);

    fetch(
      "/api/community/members?search=" + encodeURIComponent(search),
      { headers }
    )
      .then((res) => res.json())
      .then((data) => setMembers(data.data || []))
      .catch(console.error);

    fetch(
      "/api/community/villages?search=" + encodeURIComponent(search),
      { headers }
    )
      .then((res) => res.json())
      .then((data) => setVillages(data.data || []))
      .catch(console.error);

    fetch("/api/community/payment", { headers })
      .then((res) => res.json())
      .then((data) => setPayment(data.data || {}))
      .catch(console.error);
  }, [search, refreshTrigger]);

  const logout = () => {
    localStorage.clear();
    onNavigate("/login");
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearch("");
    setIsEditing(false); // Cancel edit mode when changing tab
  };

  // Edit Profile Actions
  const handleStartEdit = () => {
    setEditForm({
      name: profile.name || "",
      mobile: profile.mobile || "",
      village: profile.village || "",
      age: profile.age || "",
      email: profile.email || "",
    });
    setProfileError("");
    setProfileSuccess("");
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        onNavigate("/login");
        return;
      }

      // Automatically translate English inputs to Gujarati upon profile update
      const translatedName = transliterateEnglishToGujarati(editForm.name);
      const translatedVillage = transliterateEnglishToGujarati(editForm.village);

      const response = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: translatedName,
          mobile: editForm.mobile,
          village: translatedVillage,
          age: editForm.age,
          email: editForm.email,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || "પ્રોફાઇલ અપડેટ કરવામાં કોઈ ભૂલ આવી.");
      }

      setProfileSuccess("પ્રોફાઇલ સફળતાપૂર્વક અપડેટ કરવામાં આવી છે!");
      setProfile(resData.data.user);
      localStorage.setItem("user", JSON.stringify(resData.data.user));
      
      // Trigger update of lists/cards
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setIsEditing(false);
        setProfileSuccess("");
      }, 1500);
    } catch (err) {
      setProfileError(err.message || "કંઈક ભૂલ આવી.");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar
        tab={tab}
        setTab={handleTabChange}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={logout}
      />

      <div className="dashboard-main">
        <Topbar
          profile={profile}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <div className="dashboard-content">
          <DashboardCards
            profile={profile}
            summary={summary}
            payment={payment}
          />

          {tab === "profile" && (
            <div className="page-card profile-card-view">
              <div className="profile-header-decor"></div>
              
              {!isEditing ? (
                <div className="profile-container">
                  <div className="profile-sidebar">
                    <div className="profile-avatar-large">
                      {profile?.name ? profile.name.charAt(0) : "👤"}
                    </div>
                    <h3>{profile?.name}</h3>
                    <span className="profile-badge">સક્રિય સભ્ય</span>
                    <button className="edit-profile-btn" onClick={handleStartEdit}>
                      ✏️ માહિતી સુધારો
                    </button>
                  </div>
                  <div className="profile-details-grid">
                    <div className="profile-detail-item">
                      <span className="detail-label">👤 પૂરું નામ</span>
                      <span className="detail-value">{profile?.name || "N/A"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="detail-label">📞 મોબાઇલ નંબર</span>
                      <span className="detail-value">{profile?.mobile || "N/A"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="detail-label">🏘 ગામ</span>
                      <span className="detail-value">{profile?.village || "N/A"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="detail-label">🎂 ઉંમર</span>
                      <span className="detail-value">{profile?.age ? `${profile.age} વર્ષ` : "N/A"}</span>
                    </div>
                    <div className="profile-detail-item full-width">
                      <span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span>
                      <span className="detail-value">{profile?.email || "ઉપલબ્ધ નથી"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="profile-container">
                  <div className="profile-sidebar">
                    <div className="profile-avatar-large">
                      {profile?.name ? profile.name.charAt(0) : "👤"}
                    </div>
                    <h3>માહિતી સુધારો</h3>
                    <div className="profile-edit-actions">
                      <button type="submit" className="save-profile-btn" disabled={profileLoading}>
                        {profileLoading ? "સાચવી રહ્યું..." : "💾 સાચવો"}
                      </button>
                      <button type="button" className="cancel-profile-btn" onClick={() => setIsEditing(false)}>
                        ❌ રદ કરો
                      </button>
                    </div>
                  </div>
                  <div className="profile-details-grid">
                    {profileError && <div className="profile-alert error">{profileError}</div>}
                    {profileSuccess && <div className="profile-alert success">{profileSuccess}</div>}
                    
                    <div className="profile-detail-item edit-mode">
                      <span className="detail-label">👤 પૂરું નામ *</span>
                      <input
                        className="profile-edit-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="profile-detail-item edit-mode">
                      <span className="detail-label">📞 મોબાઇલ નંબર *</span>
                      <input
                        className="profile-edit-input"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <div className="profile-detail-item edit-mode">
                      <span className="detail-label">🏘 ગામ *</span>
                      <input
                        className="profile-edit-input"
                        value={editForm.village}
                        onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        required
                      />
                    </div>
                    <div className="profile-detail-item edit-mode">
                      <span className="detail-label">🎂 ઉંમર *</span>
                      <input
                        className="profile-edit-input"
                        type="number"
                        value={editForm.age}
                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                        required
                      />
                    </div>
                    <div className="profile-detail-item full-width edit-mode">
                      <span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span>
                      <input
                        className="profile-edit-input"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="ઈમેઇલ (વૈકલ્પિક)"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === "community" && (
            <div className="page-card community-panel">
              <div className="panel-header">
                <h2>🌍 સમાજ માહિતી અને વિગતો</h2>
                <p className="panel-subtitle">પંચશીલ સમાજના સંગઠન અને આંકડાકીય વિગતો</p>
              </div>

              <div className="community-stats-showcase">
                <div className="community-stat-box box-blue">
                  <div className="stat-icon-wrapper blue">👥</div>
                  <div className="stat-info">
                    <h4>કુલ સભ્યો</h4>
                    <h3>{summary.totalMembers || 0}</h3>
                  </div>
                </div>
                <div className="community-stat-box box-green">
                  <div className="stat-icon-wrapper green">🏘</div>
                  <div className="stat-info">
                    <h4>કુલ ગામો</h4>
                    <h3>{summary.totalVillages || 0}</h3>
                  </div>
                </div>
              </div>

              <div className="community-villages-section">
                <h3>🏘 જોડાયેલા ગામોની યાદી</h3>
                <div className="village-tags-container">
                  {(summary.villages || []).map((v, index) => (
                    <div key={v} className="village-badge-tag">
                      <span className="tag-number">{index + 1}</span>
                      <span className="tag-name">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="page-card table-panel">
              <div className="panel-header-flex">
                <div className="panel-title-area">
                  <h2>👥 સભ્યોની યાદી</h2>
                  <p className="panel-subtitle">સમાજના તમામ સભ્યોની સંપર્ક માહિતી</p>
                </div>
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="search-box-premium"
                    placeholder="નામ કે ગામથી શોધો..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {members.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="table-responsive-desktop">
                    <table className="dashboard-table-premium">
                      <thead>
                        <tr>
                          <th>સભ્યનું નામ</th>
                          <th>મોબાઇલ નંબર</th>
                          <th>ગામ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m._id}>
                            <td className="member-name-cell">
                              <div className="member-avatar-mini">
                                {m.name ? m.name.charAt(0) : "👤"}
                              </div>
                              <span className="member-name-text">{m.name}</span>
                            </td>
                            <td className="phone-cell">
                              <span className="phone-icon-span">📞</span> {m.mobile}
                            </td>
                            <td>
                              <span className="village-badge-table">{m.village}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Grid View */}
                  <div className="table-responsive-mobile">
                    <div className="member-cards-grid">
                      {members.map((m) => (
                        <div key={m._id} className="member-mobile-card">
                          <div className="member-mobile-card-header">
                            <div className="member-avatar-mini">
                              {m.name ? m.name.charAt(0) : "👤"}
                            </div>
                            <h4>{m.name}</h4>
                          </div>
                          <div className="member-mobile-card-body">
                            <div className="info-row">
                              <span>📞 ફોન:</span>
                              <strong>{m.mobile}</strong>
                            </div>
                            <div className="info-row">
                              <span>🏘 ગામ:</span>
                              <span className="village-badge-table">{m.village}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-search-state">
                  <div className="empty-icon">🔍</div>
                  <p>કોઈ સભ્યો મળ્યા નથી. કૃપા કરીને અન્ય નામ અથવા ગામ શોધો.</p>
                </div>
              )}
            </div>
          )}

          {tab === "villages" && (
            <div className="page-card table-panel">
              <div className="panel-header-flex">
                <div className="panel-title-area">
                  <h2>🏘 ગામોની યાદી</h2>
                  <p className="panel-subtitle">પંચશીલ સમાજના સભ્ય ગામો અને સભ્ય સંખ્યા</p>
                </div>
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="search-box-premium"
                    placeholder="ગામનું નામ શોધો..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {villages.length > 0 ? (
                <div className="villages-grid-premium">
                  {villages.map((v) => {
                    const maxMembers = Math.max(...villages.map(item => item.members), 1);
                    const percentage = Math.min(100, Math.round((v.members / maxMembers) * 100));
                    
                    return (
                      <div key={v.name} className="village-premium-card">
                        <div className="village-card-header">
                          <span className="village-icon-wrap">🏘</span>
                          <h3>{v.name}</h3>
                        </div>
                        <div className="village-card-body">
                          <div className="member-count-row">
                            <span>સભ્યોની સંખ્યા:</span>
                            <span className="member-count-badge">{v.members} સભ્યો</span>
                          </div>
                          <div className="village-progress-bar-container">
                            <div className="village-progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state">
                  <div className="empty-icon">🏘</div>
                  <p>કોઈ ગામ મળ્યું નથી.</p>
                </div>
              )}
            </div>
          )}

          {tab === "payment" && (
            <div className="payment-tab-container animate-fade-in">
              <div className="payment-split-layout">
                {/* Active Payment Panel */}
                <div className="page-card payment-receipt-card">
                  <div className="receipt-header">
                    <span className="flower-icon">💐</span>
                    <h2>સહાય ફંડ ચુકવણી</h2>
                    <p className="receipt-desc">સદગતના પરિવારને મદદ માટે ચાલુ યોગદાન ફંડ</p>
                  </div>

                  <div className="receipt-body">
                    <div className="receipt-row">
                      <span className="label">👤 મૃતક સભ્ય</span>
                      <span className="value bold">{payment.deceasedName || "શ્રી રમેશભાઈ પરમાર"}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="label">🏘 વતન ગામ</span>
                      <span className="value">{payment.deceasedVillage || "પાલનપુર"}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="label">📅 મૃત્યુ તારીખ</span>
                      <span className="value">{payment.deathDate || "08/07/2026"}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="label">⏰ ચુકવણીની છેલ્લી તારીખ</span>
                      <span className="value warning-text">{payment.dueDate || "15/07/2026"}</span>
                    </div>
                    
                    <div className="receipt-divider"></div>

                    <div className="receipt-row highlight">
                      <span className="label">💰 તમારું યોગદાન</span>
                      <span className="value price">₹{payment.contributionAmount || 50}</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-progress-section">
                      <div className="receipt-row small-margin">
                        <span className="label">📊 કુલ નોંધાયેલા સભ્યો</span>
                        <span className="value">{payment.totalMembers || 325}</span>
                      </div>
                      <div className="receipt-row small-margin">
                        <span className="label">📈 કુલ એકત્રિત રકમ</span>
                        <span className="value bold">₹{(payment.totalCollection !== undefined ? payment.totalCollection : 9750).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {payment.status === 'Paid' ? (
                      <div className="payment-status-banner paid">
                        <span className="status-icon">✓</span>
                        <div className="status-text">
                          <h4>ચુકવણી સફળ</h4>
                          <p>તમારી સહાય ફંડ યોગદાન ચુકવણી સફળતાપૂર્વક થઈ ગઈ છે</p>
                        </div>
                      </div>
                    ) : (
                      <div className="payment-status-banner pending">
                        <span className="status-icon">!</span>
                        <div className="status-text">
                          <h4>ચુકવણી બાકી</h4>
                          <p>કૃપા કરીને છેલ્લી તારીખ પહેલાં ચુકવણી કરો</p>
                        </div>
                      </div>
                    )}

                    {payment.status === 'Paid' ? (
                      <button className="premium-pay-btn paid" disabled>
                        ✓ ચૂકવણી પૂર્ણ થઈ ગઈ છે
                      </button>
                    ) : (
                      <button className="premium-pay-btn active" onClick={handlePayment}>
                        ₹{payment.contributionAmount || 50} સુરક્ષિત ચૂકવો
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment History Panel */}
                <div className="page-card payment-history-card">
                  <div className="panel-header">
                    <h2>📜 અગાઉની ચુકવણીઓનો ઇતિહાસ</h2>
                    <p className="panel-subtitle">તમારા દ્વારા કરવામાં આવેલ અગાઉની સહાય ફંડ વિગતો</p>
                  </div>

                  <div className="table-responsive-desktop">
                    <table className="dashboard-table-premium">
                      <thead>
                        <tr>
                          <th>મૃત સભ્ય</th>
                          <th>ગામ</th>
                          <th>મૃત્યુ તારીખ</th>
                          <th>છેલ્લી તારીખ</th>
                          <th>સ્થિતિ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payment.history && payment.history.length > 0 ? (
                          payment.history.map((h, index) => (
                            <tr key={index}>
                              <td><strong>{h.deceasedName}</strong></td>
                              <td>{h.village}</td>
                              <td>{h.deathDate}</td>
                              <td>{h.dueDate}</td>
                              <td>
                                <span className="status-pill paid">ચૂકવેલ</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr>
                              <td><strong>રમેશભાઈ પરમાર</strong></td>
                              <td>પાલનપુર</td>
                              <td>08/07/2026</td>
                              <td>15/07/2026</td>
                              <td>
                                <span className="status-pill paid">ચૂકવેલ</span>
                              </td>
                            </tr>
                            <tr>
                              <td><strong>કાનજીભાઈ પરમાર</strong></td>
                              <td>ડીસા</td>
                              <td>18/06/2026</td>
                              <td>25/06/2026</td>
                              <td>
                                <span className="status-pill paid">ચૂકવેલ</span>
                              </td>
                            </tr>
                            <tr>
                              <td><strong>મનુભાઈ પરમાર</strong></td>
                              <td>થરાદ</td>
                              <td>22/05/2026</td>
                              <td>29/05/2026</td>
                              <td>
                                <span className="status-pill paid">ચૂકવેલ</span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View for History */}
                  <div className="table-responsive-mobile">
                    <div className="history-mobile-list">
                      {(payment.history && payment.history.length > 0 ? payment.history : [
                        { deceasedName: "રમેશભાઈ પરમાર", village: "પાલનપુર", deathDate: "08/07/2026", dueDate: "15/07/2026" },
                        { deceasedName: "કાનજીભાઈ પરમાર", village: "ડીસા", deathDate: "18/06/2026", dueDate: "25/06/2026" },
                        { deceasedName: "મનુભાઈ પરમાર", village: "થરાદ", deathDate: "22/05/2026", dueDate: "29/05/2026" }
                      ]).map((h, index) => (
                        <div key={index} className="history-mobile-card">
                          <div className="history-mobile-card-header">
                            <h4>{h.deceasedName}</h4>
                            <span className="status-pill paid">ચૂકવેલ</span>
                          </div>
                          <div className="history-mobile-card-body">
                            <p><span>ગામ:</span> {h.village}</p>
                            <p><span>મૃત્યુ તારીખ:</span> {h.deathDate}</p>
                            <p><span>છેલ્લી તારીખ:</span> {h.dueDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;