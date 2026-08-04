import { useState } from "react";
import PageShell from "../components/PageShell";
import api from "../services/api";

function LoginPage({ currentPage, onNavigate }) {
  const [formData, setFormData] = useState({
    mobile: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusModal, setStatusModal] = useState(null); // 'pending' | 'rejected' | null

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");
    setStatusModal(null);

    try {
      const response = await api.post("/api/auth/login", formData);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "લોગિન નિષ્ફળ ગયું");
      }

      const token = data?.data?.token;
      const user = data?.data?.user;

      if (!token) {
        throw new Error("Token not found in response.");
      }

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setMessage("લોગિન સફળ!");
      onNavigate("/dashboard");
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "કંઈક ત્રુટિ આવી";

      if (errMsg.includes("STATUS_PENDING") || errMsg.includes("મંજૂરીની રાહમા")) {
        setStatusModal("pending");
      } else if (errMsg.includes("STATUS_REJECTED") || errMsg.includes("નામંજૂર")) {
        setStatusModal("rejected");
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      title="લોગિન"
      description="તમારા એકાઉન્ટમાં પ્રવેશ કરવા માટે નીચે માહિતી ભરો."
    >
      <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: '440px', margin: '0 auto', padding: '28px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
            📞 મોબાઇલ નંબર
          </label>
          <input
            type="text"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
            🔒 પાસવર્ડ
          </label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
          />
        </div>

        {message && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', textAlign: 'center' }}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
          }}
        >
          {loading ? "પ્રતિક્ષા..." : "સહાય પોર્ટલમાં લોગિન કરો"}
        </button>
      </form>

      {/* Big Screen Status Modal for Pending / Rejected Approval */}
      {statusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '500px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center', border: statusModal === 'pending' ? '2px solid #fde047' : '2px solid #fca5a5', animation: 'slideUpFade 0.3s ease-out' }}>
            
            {statusModal === 'pending' ? (
              <>
                <div style={{ width: '80px', height: '80px', background: '#fef9c3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 18px auto', border: '2px solid #fef08a' }}>
                  ⏳
                </div>
                <h2 style={{ color: '#854d0e', fontSize: '1.4rem', margin: '0 0 10px 0', fontWeight: '800' }}>
                  એડમિન મંજૂરીની પ્રતિક્ષા કરો!
                </h2>
                <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                  તમારું એકાઉન્ટ હજુ <strong>એડમિનની મંજૂરીની રાહમાં (Pending)</strong> છે. પંચશીલ સમાજ સમિતિ દ્વારા તમારી અરજી ચકાસીને મંજૂરી આપ્યા બાદ જ તમે પોર્ટલમાં લોગિન કરી શકશો.
                </p>
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', color: '#a16207', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', marginBottom: '24px' }}>
                  ⏳ સ્થિતિ: અરજી ચકાસણી હેઠળ છે (મંજૂરી બાકી)
                </div>
              </>
            ) : (
              <>
                <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 18px auto', border: '2px solid #fecaca' }}>
                  ❌
                </div>
                <h2 style={{ color: '#991b1b', fontSize: '1.4rem', margin: '0 0 10px 0', fontWeight: '800' }}>
                  રજિસ્ટ્રેશન અરજી નામંજૂર થયેલ છે!
                </h2>
                <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                  તમારી સભ્યો તરીકેની રજિસ્ટ્રેશન અરજી એડમિન દ્વારા ચકાસ્યા બાદ <strong>નામંજૂર (Rejected)</strong> કરવામાં આવી છે. તમારું રજિસ્ટ્રેશન રદ થયેલ હોવાથી તમે લોગિન કરી શકતા નથી.
                </p>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', marginBottom: '24px' }}>
                  🔴 સ્થિતિ: અરજી નામંજૂર થયેલ છે (રજિસ્ટ્રેશન રદ)
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setStatusModal(null)}
              style={{
                width: '100%',
                padding: '14px',
                background: statusModal === 'pending' ? 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {statusModal === 'pending' ? 'હું સમજી ગયો / પ્રતિક્ષા કરીશ' : 'બંધ કરો'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default LoginPage;