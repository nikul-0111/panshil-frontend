import PageShell from '../components/PageShell';

function ContactPage({ currentPage, onNavigate }) {
  return (
    <PageShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      title="સંપર્ક"
      description="જો તમે અમારો હિસ્સા બનવા માંગો છો, તો નીચેની માહિતી પર સંપર્ક કરો."
    >
      <div className="info-card contact-card">
        <h3>સંપર્ક માહિતી</h3>
        <p>ઈમેલ: info@panchshil.com</p>
        <p>મોબાઇલ: +91 98765 43210</p>
        <p>સરનામું: Panchshil Community, Village Center</p>
      </div>
    </PageShell>
  );
}

export default ContactPage;
