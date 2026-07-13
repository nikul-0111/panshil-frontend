import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardCards from "../components/DashboardCards";
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

  return (
    <div className="dashboard">
      <Sidebar
        tab={tab}
        setTab={setTab}
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
            <div className="page-card">
              <h2>👤 મારી માહિતી</h2>

              <p><strong>નામ :</strong> {profile?.name}</p>
              <p><strong>મોબાઇલ નંબર :</strong> {profile?.mobile}</p>
              <p><strong>ગામ :</strong> {profile?.village}</p>
              <p><strong>ઉંમર :</strong> {profile?.age}</p>
              <p><strong>ઈ-મેઈલ :</strong> {profile?.email || "ઉપલબ્ધ નથી"}</p>
            </div>
          )}

          {tab === "community" && (
            <div className="page-card">
              <h2>🌍 સમાજની માહિતી</h2>

              <p><strong>કુલ સભ્યો :</strong> {summary.totalMembers}</p>

              <p><strong>કુલ ગામો :</strong> {summary.totalVillages}</p>

              <ul>
                {(summary.villages || []).map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          )}

          {tab === "members" && (
            <div className="page-card">
              <h2>👥 સભ્યોની યાદી</h2>

              <input
                className="search-box"
                placeholder="સભ્ય શોધો..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>નામ</th>
                    <th>મોબાઇલ નંબર</th>
                    <th>ગામ</th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((m) => (
                    <tr key={m._id}>
                      <td>{m.name}</td>
                      <td>{m.mobile}</td>
                      <td>{m.village}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "villages" && (
            <div className="page-card">
              <h2>🏘 ગામોની યાદી</h2>

              <input
                className="search-box"
                placeholder="ગામ શોધો..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ગામ</th>
                    <th>સભ્યોની સંખ્યા</th>
                  </tr>
                </thead>

                <tbody>
                  {villages.map((v) => (
                    <tr key={v.name}>
                      <td>{v.name}</td>
                      <td>{v.members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "payment" && (
  <>
    <div className="page-card payment-card">

      <h2>💐 સહાય ફંડ</h2>

      <div className="payment-details">

        <div className="payment-row">
          <span>મૃત સભ્ય</span>
          <strong>{payment.deceasedName || "શ્રી રમેશભાઈ પરમાર"}</strong>
        </div>

        <div className="payment-row">
          <span>ગામ</span>
          <strong>{payment.deceasedVillage || "પાલનપુર"}</strong>
        </div>

        <div className="payment-row">
          <span>મૃત્યુ તારીખ</span>
          <strong>{payment.deathDate || "08/07/2026"}</strong>
        </div>

        <div className="payment-row">
          <span>ચુકવણી કરવાની છેલ્લી તારીખ</span>
          <strong>{payment.dueDate || "15/07/2026"}</strong>
        </div>

        <div className="payment-row">
          <span>એક સભ્યનું યોગદાન</span>
          <strong>₹{payment.contributionAmount || 50}</strong>
        </div>

        <div className="payment-row">
          <span>કુલ નોંધાયેલા સભ્યો</span>
          <strong>{payment.totalMembers || 325}</strong>
        </div>

        <div className="payment-row">
          <span>કુલ વસૂલાત</span>
          <strong>₹{(payment.totalCollection !== undefined ? payment.totalCollection : 9750).toLocaleString('en-IN')}</strong>
        </div>

        {payment.status === 'Paid' ? (
          <div className="payment-status success">
            ✅ તમારી ચુકવણી સફળતાપૂર્વક થઈ ગઈ છે
          </div>
        ) : (
          <div className="payment-status pending">
            ❌ તમારી ચુકવણી હજુ બાકી છે
          </div>
        )}

        {payment.status === 'Paid' ? (
          <button className="pay-btn paid-btn" disabled>
            ✅ ચૂકવેલ
          </button>
        ) : (
          <button className="pay-btn" onClick={handlePayment}>
            ₹{payment.contributionAmount || 50} ચૂકવો
          </button>
        )}

      </div>

    </div>

    {/* History */}

    <div className="page-card history-card">

      <h2>📜 અગાઉની સહાય ફંડ વિગતો</h2>

      <table className="dashboard-table">

        <thead>
          <tr>
            <th>મૃત સભ્ય</th>
            <th>ગામ</th>
            <th>મૃત્યુ તારીખ</th>
            <th>છેલ્લી ચુકવણી તારીખ</th>
            <th>તમારી સ્થિતિ</th>
          </tr>
        </thead>

        <tbody>

          {payment.history && payment.history.length > 0 ? (
            payment.history.map((h, index) => (
              <tr key={index}>
                <td>{h.deceasedName}</td>
                <td>{h.village}</td>
                <td>{h.deathDate}</td>
                <td>{h.dueDate}</td>
                <td className="paid">✅ ચૂકવેલ</td>
              </tr>
            ))
          ) : (
            <>
              <tr>
                <td>રમેશભાઈ પરમાર</td>
                <td>પાલનપુર</td>
                <td>08/07/2026</td>
                <td>15/07/2026</td>
                <td className="paid">✅ ચૂકવેલ</td>
              </tr>

              <tr>
                <td>કાનજીભાઈ પરમાર</td>
                <td>ડીસા</td>
                <td>18/06/2026</td>
                <td>25/06/2026</td>
                <td className="paid">✅ ચૂકવેલ</td>
              </tr>

              <tr>
                <td>મનુભાઈ પરમાર</td>
                <td>થરાદ</td>
                <td>22/05/2026</td>
                <td>29/05/2026</td>
                <td className="paid">✅ ચૂકવેલ</td>
              </tr>
            </>
          )}

        </tbody>

      </table>

    </div>

  </>
)}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;