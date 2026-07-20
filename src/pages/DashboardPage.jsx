import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardCards from "../components/DashboardCards";
import { transliterateEnglishToGujarati } from "../utils/translator";
import api from "../services/api";
import "../styles/Dashboard.css";

function DashboardPage({ onNavigate }) {
  const [tab, setTab] = useState("community");
  const [profile, setProfile] = useState({});
  const [summary, setSummary] = useState({});
  const [members, setMembers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [payment, setPayment] = useState({});
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Profile Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", village: "", age: "", email: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Default dynamic data array
  const [pendingDeaths, setPendingDeaths] = useState([
    { id: 1, name: "શ્રી રમેશભાઈ પરમાર", village: "પાલનપુર", date: "08/07/2026", dueDate: "15/07/2026", amount: 50 },
    { id: 2, name: "શ્રી અશોકભાઈ ચૌહાણ", village: "ડીસા", date: "12/07/2026", dueDate: "25/07/2026", amount: 50 }
  ]);

  const [paymentHistory, setPaymentHistory] = useState([
    { id: 101, name: "રમેશભાઈ પરમાર", village: "પાલનપુર", deathDate: "08/07/2026", payDate: "15/07/2026", status: "ચૂકવેલ" },
    { id: 102, name: "કાનજીભાઈ પરમાર", village: "ડીસા", deathDate: "18/06/2026", payDate: "25/06/2026", status: "ચૂકવેલ" },
    { id: 103, name: "મનુભાઈ પરમાર", village: "થરાદ", deathDate: "22/05/2026", payDate: "29/05/2026", status: "ચૂકવેલ" }
  ]);

  // Dynamic Date Comparison Logic
  const isDueDatePassed = (dateStr) => {
    if (!dateStr) return false;
    const [day, month, year] = dateStr.split("/").map(Number);
    const dueDate = new Date(year, month - 1, day);
    const currentDate = new Date(); 
    
    dueDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    return currentDate > dueDate;
  };

  // Automated Late Fee Accumulator 
  const calculateTotalAmount = () => {
    return pendingDeaths.reduce((sum, item) => {
      let finalAmount = Number(item.amount) || 0;
      if (isDueDatePassed(item.dueDate)) {
        finalAmount += 50; // ₹50 Penalty added if past due date
      }
      return sum + finalAmount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount();

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

      // totalAmount is already calculated by the calculateTotalAmount() helper
      if (totalAmount <= 0) {
        alert("ચુકવણી માટે કોઈ રકમ ઉપલબ્ધ નથી.");
        return;
      }

      console.log("Submitting payment for amount:", totalAmount);

      // 1. Create order on your backend
      const orderRes = await api.post("/api/community/payment/order", 
        { amount: totalAmount }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = orderRes.data;
      if (!orderData.success) {
        alert("ઓર્ડર બનાવવામાં નિષ્ફળતા: " + (orderData.message || "અજ્ઞાત ભૂલ"));
        return;
      }

      const { orderId, amount, currency, keyId } = orderData.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("રેઝરપે SDK લોડ કરવામાં નિષ્ફળ. કૃપા કરીને ઇન્ટરનેટ કનેક્શન તપાસો.");
        return;
      }

      // 3. Configure Razorpay
      const options = {
        key: keyId,
        amount: amount, // This should be in paise (e.g., 15000 for ₹150)
        currency: currency,
        name: "Panchshil Community Fund",
        description: `સહાય ફંડ કુલ ચૂકવણી - ₹${totalAmount}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // 4. Verify the payment
            const verifyRes = await api.post("/api/community/payment/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (verifyRes.data.success) {
              alert("ચુકવણી સફળતાપૂર્વક પૂર્ણ થઈ ગઈ છે!");
              setRefreshTrigger((prev) => prev + 1); // Triggers re-fetch of data
            } else {
              alert("ચુકવણી ચકાસણી નિષ્ફળ ગઈ.");
            }
          } catch (err) {
            console.error("Verification Error:", err);
            alert("ચુકવણી ચકાસણી દરમિયાન કોઈ ભૂલ આવી.");
          }
        },
        prefill: {
          name: profile.name || "",
          contact: profile.mobile || "",
          email: profile.email || "",
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment Error:", error);
      alert("ચુકવણી પ્રક્રિયા શરૂ કરવામાં ભૂલ આવી.");
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

    const headers = { Authorization: `Bearer ${token}` };

    api.get("/api/community/summary", { headers })
      .then((res) => setSummary(res.data.data || {}))
      .catch(console.error);

    api.get("/api/community/members?search=" + encodeURIComponent(search), { headers })
      .then((res) => setMembers(res.data.data || []))
      .catch(console.error);

    api.get("/api/community/villages?search=" + encodeURIComponent(search), { headers })
      .then((res) => setVillages(res.data.data || []))
      .catch(console.error);

    api.get("/api/community/payment", { headers })
      .then((res) => {
        const backendData = res.data.data || {};
        setPayment(backendData);
        if (backendData.pendingDeaths && backendData.pendingDeaths.length > 0) {
          setPendingDeaths(backendData.pendingDeaths);
        }
        if (backendData.history) setPaymentHistory(backendData.history);
      })
      .catch(console.error);

    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    if (parsedUser && parsedUser.role === 'admin') {
      api.get("/api/admin/users/pending", { headers })
        .then((res) => setPendingUsers(res.data.data || []))
        .catch(console.error);
    } else {
      setPendingUsers([]);
    }
  }, [search, refreshTrigger]);

  const logout = () => {
    localStorage.clear();
    onNavigate("/login");
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearch("");
    setIsEditing(false);
  };

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

      const translatedName = transliterateEnglishToGujarati(editForm.name);
      const translatedVillage = transliterateEnglishToGujarati(editForm.village);

      const response = await api.put("/api/auth/update-profile", {
        name: translatedName,
        mobile: editForm.mobile,
        village: translatedVillage,
        age: editForm.age,
        email: editForm.email,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = response.data;
      if (!resData.success) {
        throw new Error(resData.message || "પ્રોફાઇલ અપડેટ કરવામાં કોઈ ભૂલ આવી.");
      }

      setProfileSuccess("પ્રોફાઇલ સફળતાપૂર્વક અપડેટ કરવામાં આવી છે!");
      setProfile(resData.data.user);
      localStorage.setItem("user", JSON.stringify(resData.data.user));
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

  const handleUserApproval = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await api.put(`/api/admin/users/${userId}/status`, {
        status: newStatus,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = response.data;
      if (!resData.success) {
        throw new Error(resData.message || "અરજી પ્રોસેસ કરવામાં કોઈ ભૂલ આવી.");
      }

      alert(resData.message || "ક્રિયા સફળ રહી!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert(err.message || "કંઈક ભૂલ આવી.");
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

          {/* Registration Approvals Tab */}
          {tab === "member_approvals" && (
            <div className="page-card pending-users-panel">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  🔔 નવા રજીસ્ટ્રેશન વિનંતીઓ 
                  {pendingUsers.length > 0 && <span className="pending-badge">{pendingUsers.length}</span>}
                </h2>
                <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>કૃપા કરીને નીચેના સભ્યોની માહિતી ચકાસો અને મંજૂરી આપો.</p>
              </div>

              {pendingUsers.length > 0 ? (
                <div className="pending-users-list">
                  {pendingUsers.map((user) => (
                    <div key={user._id} className="pending-user-card">
                      <div className="pending-user-info">
                        <div className="pending-user-avatar">
                          {user.name ? user.name.charAt(0) : "👤"}
                        </div>
                        <div className="pending-user-details">
                          <h4>{user.name}</h4>
                          <p>📞 <strong>મોબાઇલ:</strong> {user.mobile}</p>
                          <p>🏘 <strong>ગામ:</strong> {user.village}</p>
                          <p>🎂 <strong>ઉંમર:</strong> {user.age} વર્ષ</p>
                          {user.email && <p>✉️ <strong>ઈમેઈલ:</strong> {user.email}</p>}
                        </div>
                      </div>
                      <div className="pending-user-actions">
                        <button className="approve-btn-premium" onClick={() => handleUserApproval(user._id, 'approved')}>✅ મંજૂર કરો</button>
                        <button className="reject-btn-premium" onClick={() => handleUserApproval(user._id, 'rejected')}>❌ નામંજૂર</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-search-state" style={{ padding: "40px 20px" }}>
                  <div className="empty-icon">🔔</div>
                  <p>હાલમાં કોઈ નવી રજીસ્ટ્રેશન વિનંતીઓ બાકી નથી.</p>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {tab === "profile" && (
            <div className="page-card profile-card-view">
              <div className="profile-header-decor"></div>
              {!isEditing ? (
                <div className="profile-container">
                  <div className="profile-sidebar">
                    <div className="profile-avatar-large">{profile?.name ? profile.name.charAt(0) : "👤"}</div>
                    <h3>{profile?.name}</h3>
                    <span className="profile-badge">સક્રિય સભ્ય</span>
                    <button className="edit-profile-btn" onClick={handleStartEdit}>✏️ માહિતી સુધારો</button>
                  </div>
                  <div className="profile-details-grid">
                    <div className="profile-detail-item"><span className="detail-label">👤 પૂરું નામ</span><span className="detail-value">{profile?.name || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">📞 મોબાઇલ નંબર</span><span className="detail-value">{profile?.mobile || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">🏘 ગામ</span><span className="detail-value">{profile?.village || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">🎂 ઉંમર</span><span className="detail-value">{profile?.age ? `${profile.age} વર્ષ` : "N/A"}</span></div>
                    <div className="profile-detail-item full-width"><span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span><span className="detail-value">{profile?.email || "ઉપલબ્ધ નથી"}</span></div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="profile-container">
                  <div className="profile-sidebar">
                    <div className="profile-avatar-large">{profile?.name ? profile.name.charAt(0) : "👤"}</div>
                    <h3>માહિતી સુધારો</h3>
                    <div className="profile-edit-actions">
                      <button type="submit" className="save-profile-btn" disabled={profileLoading}>{profileLoading ? "સાચવી રહ્યું..." : "💾 સાચવો"}</button>
                      <button type="button" className="cancel-profile-btn" onClick={() => setIsEditing(false)}>❌ રદ કરો</button>
                    </div>
                  </div>
                  <div className="profile-details-grid">
                    {profileError && <div className="profile-alert error">{profileError}</div>}
                    {profileSuccess && <div className="profile-alert success">{profileSuccess}</div>}
                    <div className="profile-detail-item edit-mode"><span className="detail-label">👤 પૂરું નામ *</span><input className="profile-edit-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">📞 મોબાઇલ નંબર *</span><input className="profile-edit-input" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">🏘 ગામ *</span><input className="profile-edit-input" value={editForm.village} onChange={(e) => setEditForm({ ...editForm, village: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">🎂 ઉંમર *</span><input className="profile-edit-input" type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} required /></div>
                    <div className="profile-detail-item full-width edit-mode"><span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span><input className="profile-edit-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="ઈમેઇલ (વૈકલ્પિક)" /></div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Community Summary Tab */}
          {tab === "community" && (
            <>
              <DashboardCards profile={profile} summary={summary} payment={payment} />
              <div className="page-card community-panel">
                <div className="panel-header">
                  <h2>🌍 સમાજ માહિતી અને વિગતો</h2>
                  <p className="panel-subtitle">પંચશીલ સમાજના સંગઠન અને આંકડાકીય વિગતો</p>
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
            </>
          )}

          {/* Members List Tab */}
          {tab === "members" && (
            <div className="page-card table-panel">
              <div className="panel-header-flex">
                <div className="panel-title-area">
                  <h2>👥 સભ્યોની યાદી</h2>
                  <p className="panel-subtitle">સમાજના તમામ સભ્યોની સંપર્ક માહિતી</p>
                </div>
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="નામ કે ગામથી શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {members.length > 0 ? (
                <>
                  <div className="table-responsive-desktop">
                    <table className="dashboard-table-premium">
                      <thead>
                        <tr><th>સભ્યનું નામ</th><th>મોબાઇલ નંબર</th><th>ગામ</th></tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m._id}>
                            <td className="member-name-cell">
                              <div className="member-avatar-mini">{m.name ? m.name.charAt(0) : "👤"}</div>
                              <span className="member-name-text">{m.name}</span>
                            </td>
                            <td className="phone-cell"><span>📞</span> {m.mobile}</td>
                            <td><span className="village-badge-table">{m.village}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-responsive-mobile">
                    <div className="member-cards-grid">
                      {members.map((m) => (
                        <div key={m._id} className="member-mobile-card">
                          <div className="member-mobile-card-header">
                            <div className="member-avatar-mini">{m.name ? m.name.charAt(0) : "👤"}</div>
                            <h4>{m.name}</h4>
                          </div>
                          <div className="member-mobile-card-body">
                            <div className="info-row"><span>📞 ફોન:</span><strong>{m.mobile}</strong></div>
                            <div className="info-row"><span>🏘 ગામ:</span><span className="village-badge-table">{m.village}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-search-state"><div className="empty-icon">🔍</div><p>કોઈ સભ્યો મળ્યા નથી. કૃપા કરીને અન્ય નામ અથવા ગામ શોધો.</p></div>
              )}
            </div>
          )}

          {/* Villages List Tab */}
          {tab === "villages" && (
            <div className="page-card table-panel">
              <div className="panel-header-flex">
                <div className="panel-title-area">
                  <h2>🏘 ગામોની યાદી</h2>
                  <p className="panel-subtitle">પંચશીલ સમાજના સભ્ય ગામો અને સભ્ય સંખ્યા</p>
                </div>
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="ગામનું નામ શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {villages.length > 0 ? (
                <div className="villages-grid-premium">
                  {villages.map((v) => {
                    const maxMembers = Math.max(...villages.map(item => item.members), 1);
                    const percentage = Math.min(100, Math.round((v.members / maxMembers) * 100));
                    return (
                      <div key={v.name} className="village-premium-card">
                        <div className="village-card-header"><span>🏘</span><h3>{v.name}</h3></div>
                        <div className="village-card-body">
                          <div className="member-count-row"><span>સભ્યોની સંખ્યા:</span><span className="member-count-badge">{v.members} સભ્યો</span></div>
                          <div className="village-progress-bar-container"><div className="village-progress-bar-fill" style={{ width: `${percentage}%` }}></div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state"><div className="empty-icon">🏘</div><p>કોઈ ગામ મળ્યું નથી.</p></div>
              )}
            </div>
          )}

          {/* Payment Interface Tab */}
          {tab === "payment" && (
            <div className="payment-tab-container animate-fade-in">
              <div className="payment-split-layout">
                
                {/* Left Column: Active Pending Deaths List */}
                <div className="page-card payment-receipt-card">
                  <div className="receipt-header">
                    <span className="flower-icon">💐</span>
                    <h2>સહાય ફંડ ચુકવણી</h2>
                    <p className="receipt-desc">સદગતના પરિવારોને મદદ માટે ચાલુ યોગદાન ફંડ</p>
                  </div>

                  <div className="receipt-body">
                    <label className="section-label" style={{ fontWeight: '600', color: '#4a5568', display: 'block', marginBottom: '10px' }}>
                      બાકી વિગતો (ચાલુ સહાય ફંડ)
                    </label>

                    <div className="pending-list-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      {pendingDeaths.length > 0 ? (
                        pendingDeaths.map((item) => {
                          const passed = isDueDatePassed(item.dueDate);
                          const calculatedItemAmount = passed ? Number(item.amount) + 50 : Number(item.amount);
                          return (
                            <div key={item.id} className="pending-death-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: passed ? '1px solid #f87171' : '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="death-item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                  <span className="death-icon" style={{ fontSize: '1.25rem' }}>💐</span>
                                  <div>
                                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>{item.name}</h4>
                                    <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>{item.village} • અંતિમ તારીખ: {item.dueDate}</p>
                                  </div>
                                </div>
                                <div className="death-item-amount" style={{ fontWeight: '700', color: passed ? '#ef4444' : '#1e293b', fontSize: '1.05rem' }}>
                                  ₹{calculatedItemAmount}
                                </div>
                              </div>
                              
                              {passed ? (
                                <div style={{ fontSize: '0.85rem', color: '#ef4444', background: '#fef2f2', padding: '6px 10px', borderRadius: '4px' }}>
                                  ⚠️ સમયસર ચુકવણી ન કરવા બદલ ₹50 લેટ ફી પેનલ્ટી ઉમેરેલ છે. (કુલ: ₹{calculatedItemAmount})
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: '#dd6b20', background: '#fffaf0', padding: '6px 10px', borderRadius: '4px' }}>
                                  💡 માહિતી: જો તમે છેલ્લી તારીખ ({item.dueDate}) સુધીમાં ચુકવણી નહીં કરો, તો ત્યારબાદ ₹50 પેનલ્ટી (લેટ ફી) અલગથી ચૂકવવી પડશે.
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="payment-status-banner paid" style={{ margin: 0 }}>
                          <span className="status-icon">✓</span>
                          <div className="status-text">
                            <h4>કોઈ ચુકવણી બાકી નથી</h4>
                            <p>તમારી બધી જ સહાય ફંડ ચુકવણીઓ પૂર્ણ થઈ ગઈ છે.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row highlight">
                      <span className="label">💰 તમારું કુલ યોગદાન:</span>
                      <span className="value price">₹{totalAmount}</span>
                    </div>

                    {totalAmount > 0 && (
                      <>
                        <div className="payment-status-banner pending" style={{ marginTop: '15px', backgroundColor: '#fffaf0', borderColor: '#feebc8' }}>
                          <span className="status-icon" style={{ color: '#dd6b20' }}>!</span>
                          <div className="status-text">
                            <h4 style={{ color: '#dd6b20' }}>ચુકવણી બાકી</h4>
                            <p style={{ color: '#718096' }}>કૃપા કરીને પેનલ્ટીથી બચવા છેલ્લી તારીખ પહેલાં ચુકવણી પૂર્ણ કરો.</p>
                          </div>
                        </div>

                        <button className="premium-pay-btn active" onClick={handlePayment} style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          ₹{totalAmount} સુરક્ષિત ચૂકવો
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: History List */}
                <div className="page-card payment-history-card">
                  <div className="panel-header">
                    <h2>📜 ભૂતકાળની ચુકવણીનો ઇતિહાસ</h2>
                    <p className="panel-subtitle">તમારા દ્વારા કરવામાં આવેલ અગાઉની સહાય ફંડ વિગતો</p>
                  </div>

                  <div className="table-responsive-desktop">
                    <table className="dashboard-table-premium">
                      <thead>
                        <tr><th>મૃત સભ્ય</th><th>ગામ</th><th>મૃત્યુ તારીખ</th><th>ચુકવણી તારીખ</th><th>સ્થિતિ</th></tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((row) => (
                          <tr key={row.id}>
                            <td><strong>{row.name}</strong></td><td>{row.village}</td><td>{row.deathDate}</td><td>{row.payDate}</td>
                            <td><span className="status-pill paid">{row.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-responsive-mobile">
                    <div className="history-mobile-list">
                      {paymentHistory.map((row) => (
                        <div key={row.id} className="history-mobile-card">
                          <div className="history-card-header"><h4>{row.name}</h4><span className="status-pill paid">{row.status}</span></div>
                          <div className="history-card-body">
                            <div className="info-row"><span>🏘 ગામ:</span><span>{row.village}</span></div>
                            <div className="info-row"><span>💐 મૃત્યુ તારીખ:</span><span>{row.deathDate}</span></div>
                            <div className="info-row"><span>📅 ચુકવણી તારીખ:</span><span>{row.payDate}</span></div>
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