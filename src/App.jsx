import Hero from "./components/Hero";
import Clinic from "./components/Clinic";
import InfoSections from "./components/InfoSections";

function App() {
  return (
    <div id="top" className="min-h-screen bg-bg text-ink relative">
      {/* faint column grid over the whole page */}
      <div aria-hidden="true" className="gridlines pointer-events-none fixed inset-0 z-0 opacity-70" />
      <div className="relative z-10">
        <Hero />
        <main>
          <Clinic />
          <InfoSections />
        </main>
      </div>
    </div>
  );
}

export default App;
