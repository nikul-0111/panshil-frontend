function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <p className="section-tag">પંચશીલમાં સ્વાગત છે</p>
        <h1>પરિવારોને એકસાથે મદદ કરતું સમુદાય</h1>
        <p className="hero-quote">
          “જ્યારે કોઈ સભ્યનું અવસાન થાય છે, ત્યારે સંપૂર્ણ સમુદાય એકસાથે ઊભું રહે છે.”
        </p>
        <p className="hero-description">
          પંચશીલ એ એક સમુદાય આધારિત પ્લેટફોર્મ છે જે કષ્ટના સમય દરમિયાન ગામોને એકસાથે લાવે છે.
          દરેક નોંધાયેલ સભ્ય નિમિત્તે એક નાની રકમ યોગદાન આપે છે જેથી વિદાય પામેલ સભ્યના પરિવારને એકલોણું ન રહેવું પડે.
        </p>
        <p className="hero-description secondary">
          આપણે એકસાથે કરુણા, એકતા અને દરેક પરિવાર માટે આર્થિક સહાયનું строительство કરીએ છીએ.
        </p>
      </div>

      <div className="hero-visual" aria-label="Community support illustration">
        <div className="illustration-card">
          <div className="icon-row">
            <span className="icon">👨‍👩‍👧‍👦</span>
            <span className="icon">🤝</span>
            <span className="icon">🏠</span>
          </div>
          <h3>ગામના લોકો એકસાથે ઊભા</h3>
          <ul>
            <li>મદદરૂપ હાથે</li>
            <li>પરિવાર આધાર</li>
            <li>યોગદાન</li>
            <li>સમુદાય એકતા</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
