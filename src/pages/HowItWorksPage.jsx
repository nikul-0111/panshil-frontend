import PageShell from '../components/PageShell';

function HowItWorksPage({ currentPage, onNavigate }) {
  return (
    <PageShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      title="આ કેવી રીતે કામ કરે છે"
      description="પંચશીલની પદ્ધતિ સરળ અને પારદર્શક છે, જેથી દરેક સદસ્ય સહાયનો હિસ્સો આપી શકે."
    >
      <div className="steps-grid">
        <div className="info-card">
          <h3>1. સભ્ય જોડાઓ</h3>
          <p>સદસ્ય રજીસ્ટર કરીને સમુદાયનો હિસ્સો બને છે.</p>
        </div>
        <div className="info-card">
          <h3>2. યોગદાન આપો</h3>
          <p>દરેક સભ્ય નાની રકમથી આ સહાય માટે યોગદાન આપે છે.</p>
        </div>
        <div className="info-card">
          <h3>3. સહાય પૂરી પાડો</h3>
          <p>જ્યારે કોઈ પરિવારને જરૂરી help ની જરૂર પડે ત્યારે આ ફંડનો ઉપયોગ થાય છે.</p>
        </div>
      </div>
    </PageShell>
  );
}

export default HowItWorksPage;
