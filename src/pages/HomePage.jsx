import '../styles/HomePage.css';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import WhyPanchshil from '../components/WhyPanchshil';

function HomePage({ currentPage, onNavigate }) {
  return (
    <div className="homepage">
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />
      <HeroSection />
      <WhyPanchshil />
    </div>
  );
}

export default HomePage;
