import { useState } from 'react';
import PageShell from '../components/PageShell';

function RegisterPage({ currentPage, onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: '',
    age: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('પાસવર્ડ અને પુષ્ટિ મેળ ખાતા નથી');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          mobile: formData.mobile,
          village: formData.village,
          age: formData.age,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'રજિસ્ટર નિષ્ફળ ગયું');
      }

      localStorage.setItem('token', data.token || '');
      setMessage(data.message || 'રજિસ્ટર સફળ');
      onNavigate('/login');
    } catch (err) {
      setError(err.message || 'કંઈ ત્રુટિ આવી');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell currentPage={currentPage} onNavigate={onNavigate} title="રજિસ્ટર" description="સદસ્ય બનવા માટે નીચેની માહિતી ભરો.">
      <form className="form-card" onSubmit={handleSubmit}>
        <label>નામ *</label>
        <input name="name" value={formData.name} onChange={handleChange} placeholder="નામ" required />
        <label>મોબાઇલ *</label>
        <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="મોબાઇલ નંબર" required />
        <label>ગામ *</label>
        <input name="village" value={formData.village} onChange={handleChange} placeholder="ગામ" required />
        <label>ઉંમર *</label>
        <input name="age" value={formData.age} onChange={handleChange} placeholder="ઉંમર" required />
        <label>ઈમેઇલ (વૈકલ્પિક)</label>
        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="ઈમેઇલ" />
        <label>પાસવર્ડ *</label>
        <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="પાસવર્ડ" required />
        <label>પાસવર્ડની પુષ્ટિ *</label>
        <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="પાસવર્ડ પુષ્ટિ" required />
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'પ્રતિક્ષા...' : 'રજિસ્ટર'}</button>
      </form>
    </PageShell>
  );
}

export default RegisterPage;
