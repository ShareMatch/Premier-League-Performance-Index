
import HeroSection from './components/HeroSection';
import StrategicPoint from './components/StrategicPoint';
import { strategicPoints } from './data/strategicPoints';

function App() {
  return (
    <main className="bg-gray-950 min-h-screen text-gray-100 selection:bg-brand/30 selection:text-brand-accent">
      <HeroSection />

      <div className="flex flex-col gap-0 pb-32">
        {strategicPoints.map((point, index) => (
          <StrategicPoint
            key={point.id}
            data={point}
            index={index}
          />
        ))}
      </div>

      <footer className="py-12 border-t border-gray-900 text-center">
        <p className="text-gray-600 text-sm font-display italic">
          ShareMatch &copy; 2025. Confidential & Proprietary.
        </p>
      </footer>
    </main>
  );
}

export default App;
