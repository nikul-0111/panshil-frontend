import PageShell from '../components/PageShell';

function AboutPage({ currentPage, onNavigate }) {
  return (
    <PageShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      title="અમારા વિશે"
      description="પંચશીલ એક સહાનુભૂતિભર્યું સમુદાય છે જે પરિવારને મુશ્કેલ સમયે એકસાથે ઊભા રહેવા મદદ કરે છે."
    >
      <div className="info-grid">
        <div className="info-card">
          <h3>અમારું ધ્યેય</h3>
          <p>દરેક પરિવારને તેમના પ્રેમીજનોના વિદાય પછી સશક્ત અને સહાયક સહાય પૂરી પાડવી.</p>
        </div>
        <div className="info-card">
          <h3>અમારા દ્વારા</h3>
          <p>સદસ્યોએ નિયમિત યોગદાન આપીને અને એક અન્યની મદદ કરીને આ સમુદાયને મજબૂત બનાવીએ છીએ.</p>
        </div>
      </div>
    </PageShell>
  );
}

export default AboutPage;
