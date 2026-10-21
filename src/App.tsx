import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Architecture from './components/Architecture';
import TechStack from './components/TechStack';
import DirectoryStructure from './components/DirectoryStructure';
import Implementation from './components/Implementation';
import Phases from './components/Phases';
import Setup from './components/Setup';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-surface text-slate-200">
      <Navbar />
      <main>
        <Hero />
        <Architecture />
        <TechStack />
        <DirectoryStructure />
        <Implementation />
        <Phases />
        <Setup />
      </main>
      <Footer />
    </div>
  );
}
