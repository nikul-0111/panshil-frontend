import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardCards from "../components/DashboardCards";
import { transliterateEnglishToGujarati } from "../utils/translator";
import { generateReceiptPDF } from "../utils/generateReceiptPDF";
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
  const [reportFilter, setReportFilter] = useState("paid");

  // Admin Add Death Event States
  const [showAddDeathModal, setShowAddDeathModal] = useState(false);
  const [deathForm, setDeathForm] = useState({ name: "", village: "", deathDate: "", dueDate: "", amount: 50 });
  const [deathLoading, setDeathLoading] = useState(false);

  const handleAddDeathSubmit = async (e) => {
    e.preventDefault();
    if (!deathForm.name || !deathForm.village || !deathForm.deathDate || !deathForm.dueDate) {
      alert("કૃપા કરીને બધી જ જરૂરી વિગતો ભરો.");
      return;
    }
    try {
      setDeathLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.post("/api/admin/death-event", deathForm, { headers });
      if (res.data.success) {
        alert("સદગત મરણ નોંધ સફળતાપૂર્વક ઉમેરાઈ ગઈ છે.");
        setDeathForm({ name: "", village: "", deathDate: "", dueDate: "", amount: 50 });
        setShowAddDeathModal(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(res.data.message || "મરણ નોંધ સાચવવામાં સમસ્યા આવી.");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "સર્વર ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.");
    } finally {
      setDeathLoading(false);
    }
  };

  // Profile Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", village: "", age: "", email: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Dynamic data arrays initialized as empty
  const [pendingDeaths, setPendingDeaths] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

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

  // Automated Late Fee Accumulator (₹50 Base + ₹50 Penalty if past due date)
  const calculateTotalAmount = () => {
    return pendingDeaths.reduce((sum, item) => {
      let itemAmount = Number(item.amount) > 0 ? Number(item.amount) : 50;
      if (isDueDatePassed(item.dueDate)) {
        itemAmount += 50; // ₹50 Late Fee Penalty added if past due date
      }
      return sum + itemAmount;
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

      if (totalAmount <= 0) {
        alert("ચુકવણી માટે કોઈ રકમ ઉપલબ્ધ નથી.");
        return;
      }

      console.log("Submitting payment for amount:", totalAmount);

      // 1. Create order on your backend
      const orderRes = await api.post("/api/community/payment/order",
        {
          amount: totalAmount,
          deceasedName: pendingDeaths.map((d) => d.name).join(", "),
          village: pendingDeaths.map((d) => d.village).join(", "),
          deathDate: pendingDeaths.map((d) => d.date || d.deathDate).join(", "),
          dueDate: pendingDeaths.map((d) => d.dueDate).join(", ")
        },
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
        amount: amount,
        currency: currency,
        name: "Panchshil Community Fund",
        description: `સહાય ફંડ કુલ ચૂકવણી - ₹${totalAmount}`,
        order_id: orderId,
        handler: async function (response) {
          // Pre-open window BEFORE async API call so browser pop-up blocker DOES NOT block it!
          const receiptWin = window.open("", "_blank");
          if (receiptWin) {
            receiptWin.document.write(`
              <!DOCTYPE html>
              <html>
              <head><title>રસીદ જનરેટ થઈ રહી છે...</title></head>
              <body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #1e293b;">
                <div style="max-width: 400px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
                  <h3 style="color: #2563eb; margin-bottom: 8px;">ચુકવણી ચકાસાઈ રહી છે...</h3>
                  <p style="color: #64748b; font-size: 14px;">તમારી અધિકૃત PDF રસીદ ક્ષણવારમાં ખુલી રહી છે...</p>
                </div>
              </body>
              </html>
            `);
          }

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
              const verifiedData = verifyRes.data.data || {};
              const receiptPayload = {
                ...verifiedData,
                name: pendingDeaths.map((d) => d.name).join(", "),
                amount: totalAmount,
                paymentId: response.razorpay_payment_id,
              };

              // Instantly clear pending deaths list from local state
              setPendingDeaths([]);
              generateReceiptPDF(receiptPayload, profile, receiptWin);
              setRefreshTrigger((prev) => prev + 1);
            } else {
              if (receiptWin && !receiptWin.closed) receiptWin.close();
              alert("ચુકવણી ચકાસણી નિષ્ફળ ગઈ.");
            }
          } catch (err) {
            if (receiptWin && !receiptWin.closed) receiptWin.close();
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

      // Handle Payment Failure
      rzp.on('payment.failed', function (response) {
        console.error("Payment Failed:", response.error);
        alert(`ચુકવણી નિષ્ફળ ગઈ! (Payment Failed)\nકારણ: ${response.error.description}`);
        // Optionally, you could make an API call here to your backend to log the failure
      });

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
        if (Array.isArray(backendData.pendingDeaths)) {
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

          {/* Admin Add Death Event Tab (Separate Sidebar Option) */}
          {tab === "add_death_event" && (
            <div className="page-card add-death-panel animate-fade-in">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      ➕ નવી સદગત મરણ નોંધ ઉમેરો
                    </h2>
                    <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                      મૃત્યુ પામેલ સભ્યની માહિતી અને છેલ્લી તારીખ ઉમેરીને નવા સહાય ફંડની જાહેરાત કરો
                    </p>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: '700', padding: '6px 16px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                    👑 એડમિન એન્ટ્રી ફોર્મ
                  </span>
                </div>
              </div>

              {/* Form Card */}
              <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '24px', maxWidth: '650px', margin: '0 auto 30px auto', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <form onSubmit={handleAddDeathSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                      👤 સ્વર્ગસ્થ સભ્યનું પૂરું નામ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. શ્રી રમેશભાઈ પરમાર"
                      value={deathForm.name}
                      onChange={(e) => setDeathForm({ ...deathForm, name: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        🏘 ગામનું નામ *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="દા.ત. પાલનપુર"
                        value={deathForm.village}
                        onChange={(e) => setDeathForm({ ...deathForm, village: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        📅 મૃત્યુ તારીખ *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DD/MM/YYYY (દા.ત. 28/07/2026)"
                        value={deathForm.deathDate}
                        onChange={(e) => setDeathForm({ ...deathForm, deathDate: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        ⏳ ચુકવણીની અંતિમ તારીખ (Due Date) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DD/MM/YYYY (દા.ત. 05/08/2026)"
                        value={deathForm.dueDate}
                        onChange={(e) => setDeathForm({ ...deathForm, dueDate: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        💰 સહાય ફંડ રકમ (પ્રતિ સભ્ય)
                      </label>
                      <input
                        type="number"
                        required
                        value={deathForm.amount}
                        onChange={(e) => setDeathForm({ ...deathForm, amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={deathLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1.05rem',
                        boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {deathLoading ? "સાચવી રહ્યું..." : "💾 સહાય ફંડ સત્તાવાર રીતે જાહેર કરો"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recently Active Death Events List */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 તાજેતરમાં જાહેર કરેલ સહાય ફંડ ની યાદી
                </h3>
                <div className="table-responsive-desktop">
                  <table className="dashboard-table-premium">
                    <thead>
                      <tr>
                        <th>સ્વર્ગસ્થ સભ્યનું નામ</th>
                        <th>ગામ</th>
                        <th>મૃત્યુ તારીખ</th>
                        <th>અંતિમ તારીખ</th>
                        <th>રકમ per Member</th>
                        <th>સ્થિતિ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.activeDeathReport ? (
                        <tr>
                          <td><strong>{payment.activeDeathReport.deceasedName}</strong></td>
                          <td><span className="village-badge-table">{payment.activeDeathReport.village}</span></td>
                          <td>{payment.activeDeathReport.deathDate}</td>
                          <td>{payment.activeDeathReport.dueDate}</td>
                          <td><strong style={{ color: '#166534' }}>₹50</strong></td>
                          <td><span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>🟢 સક્રિય (Active)</span></td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>કોઈ સક્રિય મરણ નોંધ નથી.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Admin Death Reports Tab */}
          {tab === "death_reports" && (
            <div className="page-card death-reports-panel animate-fade-in">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      📊 સદગત સહાય ફંડ રિપોર્ટ & એનાલિટિક્સ
                    </h2>
                    <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                      સ્વર્ગસ્થ સભ્યના કલ્યાણ ફંડ માટે ચૂકવેલ અને બાકી સભ્યોની સંપૂર્ણ યાદી
                    </p>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: '700', padding: '6px 16px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                    👑 એડમિન પોર્ટલ
                  </span>
                </div>
              </div>

              {/* Add Death Event Modal */}
              {showAddDeathModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
                  <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💐 નવી સદગત મરણ નોંધ ઉમેરો
                      </h3>
                      <button onClick={() => setShowAddDeathModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                    </div>

                    <form onSubmit={handleAddDeathSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          👤 સ્વર્ગસ્થ સભ્યનું પૂરું નામ *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. શ્રી રમેશભાઈ પરમાર"
                          value={deathForm.name}
                          onChange={(e) => setDeathForm({ ...deathForm, name: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            🏘 ગામનું નામ *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="દા.ત. પાલનપુર"
                            value={deathForm.village}
                            onChange={(e) => setDeathForm({ ...deathForm, village: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            📅 મૃત્યુ તારીખ *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="DD/MM/YYYY (દા.ત. 28/07/2026)"
                            value={deathForm.deathDate}
                            onChange={(e) => setDeathForm({ ...deathForm, deathDate: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            ⏳ ચુકવણીની અંતિમ તારીખ (Due Date) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="DD/MM/YYYY (દા.ત. 05/08/2026)"
                            value={deathForm.dueDate}
                            onChange={(e) => setDeathForm({ ...deathForm, dueDate: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            💰 સહાય ફંડ રકમ (પ્રતિ સભ્ય)
                          </label>
                          <input
                            type="number"
                            required
                            value={deathForm.amount}
                            onChange={(e) => setDeathForm({ ...deathForm, amount: Number(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddDeathModal(false)}
                          style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                          રદ કરો
                        </button>
                        <button
                          type="submit"
                          disabled={deathLoading}
                          style={{ padding: '9px 20px', background: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                        >
                          {deathLoading ? "સાચવી રહ્યું..." : "💾 સહાય ફંડ જાહેર કરો"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Event Header Banner */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '2rem' }}>💐</span>
                  <div style={{ flex: 1 }}>
                    {payment.activeDeathReport ? (
                      <>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                          ચાલુ મરણ સહાય: <strong>{payment.activeDeathReport.deceasedName}</strong> ({payment.activeDeathReport.village})
                        </h3>
                        <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                          મૃત્યુ તારીખ: {payment.activeDeathReport.deathDate} • અંતિમ તારીખ: {payment.activeDeathReport.dueDate} • નિયમિત યોગદાન: ₹50/સભ્ય
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                          ચાલુ મરણ સહાય: <strong>કોઈ સક્રિય મરણ સહાય નોંધાયેલ નથી</strong>
                        </h3>
                        <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                          એડમિન દ્વારા નવી સદગત નોંધ ઉમેરવામાં આવ્યા બાદ અહીં અને સભ્યોના એકાઉન્ટમાં ચુકવણી દર્શાવવામાં આવશે.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>👥 કુલ સભ્યો Target</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{payment.analytics?.totalMembers || payment.totalMembers || 0} સભ્યો</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>લક્ષ્યાંક: ₹{payment.analytics?.totalTargetAmount || 0}</span>
                </div>

                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0', cursor: 'pointer' }} onClick={() => setReportFilter('paid')}>
                  <span style={{ fontSize: '0.82rem', color: '#166534', display: 'block' }}>🟢 એકત્રિત રકમ (ચૂકવેલ સભ્યો)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '1.4rem' }}>₹{payment.analytics?.totalCollectedAmount || 0}</h3>
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '600' }}>{payment.analytics?.paidUsersCount || 0} સભ્યોએ રકમ ચૂકવી</span>
                </div>

                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '10px', border: '1px solid #fecaca', cursor: 'pointer' }} onClick={() => setReportFilter('pending')}>
                  <span style={{ fontSize: '0.82rem', color: '#991b1b', display: 'block' }}>🔴 બાકી રકમ (ચુકવણી બાકી સભ્યો)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#dc2626', fontSize: '1.4rem' }}>₹{payment.analytics?.remainingPendingAmount || 0}</h3>
                  <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: '600' }}>{payment.analytics?.pendingUsersCount || 0} સભ્યોની રકમ બાકી</span>
                </div>

                <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '0.82rem', color: '#1e40af', display: 'block' }}>📈 કલેક્શન પૂર્ણતા</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#1d4ed8', fontSize: '1.4rem' }}>{payment.analytics?.progressPercentage || 0}%</h3>
                  <div style={{ marginTop: '8px', background: '#dbeafe', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${payment.analytics?.progressPercentage || 0}%`, background: '#2563eb', height: '100%' }}></div>
                  </div>
                </div>
              </div>

              {/* Filter Buttons & Search Wrapper */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setReportFilter('paid')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      background: reportFilter === 'paid' ? '#166534' : '#f1f5f9',
                      color: reportFilter === 'paid' ? '#ffffff' : '#475569',
                      boxShadow: reportFilter === 'paid' ? '0 4px 10px rgba(22,101,52,0.2)' : 'none'
                    }}
                  >
                    🟢 ચૂકવણી કરેલ સભ્યો ({(payment.paidUsersList || []).length})
                  </button>
                  <button
                    onClick={() => setReportFilter('pending')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      background: reportFilter === 'pending' ? '#dc2626' : '#f1f5f9',
                      color: reportFilter === 'pending' ? '#ffffff' : '#475569',
                      boxShadow: reportFilter === 'pending' ? '0 4px 10px rgba(220,38,38,0.2)' : 'none'
                    }}
                  >
                    🔴 ચુકવણી બાકી સભ્યો ({(payment.pendingUsersList || []).length})
                  </button>
                </div>

                <div className="search-wrapper" style={{ margin: 0 }}>
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="નામ કે ગામથી શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {/* Paid Members Table View */}
              {reportFilter === 'paid' && (
                <div className="table-responsive-desktop">
                  <table className="dashboard-table-premium">
                    <thead>
                      <tr>
                        <th>સભ્યનું નામ</th>
                        <th>મોબાઇલ નંબર</th>
                        <th>ગામ</th>
                        <th>ચૂકવણી તારીખ & સમય</th>
                        <th>રકમ</th>
                        <th>પેમેન્ટ ID</th>
                        <th>રસીદ નંબર</th>
                        <th>ક્રિયા</th>
                      </tr>
                    </thead>
                      <tbody>
                      {(payment.paidUsersList || [])
                        .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.village.toLowerCase().includes(search.toLowerCase()) || u.mobile.includes(search))
                        .map((row) => (
                          <tr key={row.id}>
                            <td><strong>{row.name}</strong></td>
                            <td>📞 {row.mobile}</td>
                            <td><span className="village-badge-table">{row.village}</span></td>
                            <td>{row.payDate}</td>
                            <td><strong style={{ color: '#059669' }}>₹{row.amount}</strong></td>
                            <td><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '3px 7px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{row.paymentId}</code></td>
                            <td><span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: '600' }}>🧾 {row.receiptNumber}</span></td>
                            <td>
                              <button
                                onClick={() => generateReceiptPDF(row, profile)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                              >
                                📥 PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pending Members Table View */}
              {reportFilter === 'pending' && (
                <div className="table-responsive-desktop">
                  <table className="dashboard-table-premium">
                    <thead>
                      <tr>
                        <th>સભ્યનું નામ</th>
                        <th>મોબાઇલ નંબર</th>
                        <th>ગામ</th>
                        <th>બાકી સહાય ફંડ</th>
                        <th>અંતિમ તારીખ</th>
                        <th>સ્થિતિ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payment.pendingUsersList || [])
                        .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.village.toLowerCase().includes(search.toLowerCase()) || u.mobile.includes(search))
                        .map((u) => (
                          <tr key={u.id}>
                            <td><strong>{u.name}</strong></td>
                            <td>📞 {u.mobile}</td>
                            <td><span className="village-badge-table">{u.village}</span></td>
                            <td><strong style={{ color: '#dc2626' }}>₹{u.amount}</strong></td>
                            <td>{u.dueDate}</td>
                            <td><span className="status-pill pending" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>⚠️ બાકી (Pending)</span></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
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
                        <div style={{
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          padding: '30px 20px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(22, 101, 52, 0.05)'
                        }}>
                          <div style={{ fontSize: '3rem', color: '#166534', lineHeight: 1, marginBottom: '12px' }}>✓</div>
                          <h3 style={{ color: '#166534', fontSize: '1.25rem', fontWeight: '700', margin: '0 0 8px 0' }}>
                            કોઈ ચુકવણી બાકી નથી!
                          </h3>
                          <p style={{ color: '#15803d', fontSize: '0.92rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                            તમારી બધી જ સહાય ફંડ ચુકવણીઓ સફળતાપૂર્વક પૂર્ણ થઈ ગઈ છે. પંચશીલ સમાજ સેવા અને સહયોગ માટે તમારો આભાર!
                          </p>
                          <span style={{
                            display: 'inline-block',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: '700',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            border: '1px solid #86efac'
                          }}>
                            ✓ સ્થિતિ: ચૂકવણી પૂર્ણ (PAID)
                          </span>
                        </div>
                      )}
                    </div>

                    {pendingDeaths.length > 0 && (
                      <>
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
                        <tr>
                          <th>મૃત સભ્ય</th>
                          <th>ગામ</th>
                          <th>મૃત્યુ તારીખ</th>
                          <th>ચુકવણી તારીખ</th>
                          <th>કુલ રકમ</th>
                          <th>પેમેન્ટ ID</th>
                          <th>રસીદ નંબર</th>
                          <th>સ્થિતિ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((row, index) => {
                          const displayStatus = (row.status === "completed" || row.status === "Paid" || !row.status) ? "ચૂકવણી થઈ ગઈ છે" : row.status;
                          const pId = row.paymentId || row.razorpayPaymentId || `pay_${(row.id || row._id || index).toString().slice(-8)}`;
                          const rcpNo = row.receiptNumber || `RCP-2026-${(row.id || row._id || index).toString().slice(-4).toUpperCase()}`;
                          const rawPayDate = row.payDate || row.paymentDate;
                          const displayPayDate = (rawPayDate && rawPayDate !== "-") ? rawPayDate : (new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

                          return (
                            <tr key={row.id || row._id || index}>
                              <td><strong>{row.name || row.deceasedName || "સહાય ફંડ"}</strong></td>
                              <td>{row.village || "-"}</td>
                              <td>{row.deathDate || "-"}</td>
                              <td>{displayPayDate}</td>
                              <td><strong style={{ color: '#059669', fontSize: '0.95rem' }}>₹{row.amount || 50}</strong></td>
                              <td><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '3px 7px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{pId}</code></td>
                              <td>
                                <button
                                  onClick={() => generateReceiptPDF(row, profile)}
                                  title="રસીદ પ્રિન્ટ / PDF ડાઉનલોડ કરો"
                                  style={{
                                    fontSize: '0.82rem',
                                    color: '#2563eb',
                                    fontWeight: '600',
                                    background: '#eff6ff',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  🧾 {rcpNo} 📥 PDF
                                </button>
                              </td>
                              <td><span className="status-pill paid">{displayStatus}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-responsive-mobile">
                    <div className="history-mobile-list">
                      {paymentHistory.map((row, index) => {
                        const displayStatus = (row.status === "completed" || row.status === "Paid" || !row.status) ? "ચૂકવણી થઈ ગઈ છે" : row.status;
                        const pId = row.paymentId || row.razorpayPaymentId || `pay_${(row.id || row._id || index).toString().slice(-8)}`;
                        const rcpNo = row.receiptNumber || `RCP-2026-${(row.id || row._id || index).toString().slice(-4).toUpperCase()}`;
                        const rawPayDate = row.payDate || row.paymentDate;
                        const displayPayDate = (rawPayDate && rawPayDate !== "-") ? rawPayDate : (new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

                        return (
                          <div key={row.id || row._id || index} className="history-mobile-card">
                            <div className="history-card-header">
                              <h4>{row.name || row.deceasedName || "સહાય ફંડ"}</h4>
                              <span className="status-pill paid">{displayStatus}</span>
                            </div>
                            <div className="history-card-body">
                              <div className="info-row"><span>🏘 ગામ:</span><span>{row.village || "-"}</span></div>
                              <div className="info-row"><span>💐 મૃત્યુ તારીખ:</span><span>{row.deathDate || "-"}</span></div>
                              <div className="info-row"><span>📅 ચુકવણી તારીખ:</span><span>{displayPayDate}</span></div>
                              <div className="info-row"><span>💰 કુલ રકમ:</span><strong style={{ color: '#059669' }}>₹{row.amount || 50}</strong></div>
                              <div className="info-row"><span>🆔 પેમેન્ટ ID:</span><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{pId}</code></div>
                              <div style={{ marginTop: '10px' }}>
                                <button
                                  onClick={() => generateReceiptPDF(row, profile)}
                                  style={{
                                    width: '100%',
                                    fontSize: '0.88rem',
                                    color: '#1d4ed8',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #bfdbfe',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 5px rgba(37,99,235,0.08)'
                                  }}
                                >
                                  🧾 {rcpNo} • 📥 PDF રસીદ ડાઉનલોડ
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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