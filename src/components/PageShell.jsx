import Navbar from './Navbar';

function PageShell({ currentPage, onNavigate, title, description, children }) {
  return (
    <div className="page-shell">
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="page-main">
        <section className="page-card">
          <div className="page-heading">
            <p className="section-tag">પંચશીલ</p>
            <h1>{title}</h1>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}

export default PageShell;
