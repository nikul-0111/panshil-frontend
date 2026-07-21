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

    try {
      const response = await api.post("/api/auth/login", formData);
      const data = response.data;

      console.log("Login Response:", data);

      if (!data.success) {
        throw new Error(data.message || "લોગિન નિષ્ફળ ગયું");
      }

      // Backend response:
      // {
      //   success:true,
      //   message:"",
      //   data:{
      //      user:{},
      //      token:"..."
      //   }
      // }

      const token = data?.data?.token;
      const user = data?.data?.user;

      if (!token) {
        throw new Error("Token not found in response.");
      }

      // Save login data
      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setMessage("લોગિન સફળ!");

      // Redirect
      onNavigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "કંઈક ત્રુટિ આવી");
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
      <form className="form-card" onSubmit={handleSubmit}>
        <label>મોબાઇલ નંબર</label>

        <input
          type="text"
          name="mobile"
          placeholder="મોબાઇલ નંબર"
          value={formData.mobile}
          onChange={handleChange}
          required
        />

        <label>પાસવર્ડ</label>

        <input
          type="password"
          name="password"
          placeholder="પાસવર્ડ"
          value={formData.password}
          onChange={handleChange}
          required
        />

        {message && (
          <p style={{ color: "green", marginTop: 10 }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "red", marginTop: 10 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "પ્રતિક્ષા..." : "લોગિન"}
        </button>
      </form>
    </PageShell>
  );
}

export default LoginPage;