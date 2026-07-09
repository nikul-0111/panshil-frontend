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
  }, [search]);

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
            <div className="page-card">
              <h2>💳 ચુકવણીની માહિતી</h2>

              <p><strong>નામ :</strong> {payment.memberName}</p>
              <p><strong>મોબાઇલ નંબર :</strong> {payment.mobile}</p>
              <p><strong>ગામ :</strong> {payment.village}</p>
              <p><strong>ચુકવણી સ્થિતિ :</strong> {payment.status}</p>
              <p><strong>સભ્ય ફી :</strong> ₹{payment.amount}</p>
              <p><strong>આગામી ચુકવણી તારીખ :</strong> {payment.nextDue}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;