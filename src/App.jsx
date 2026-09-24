import Hero from "./components/Hero";
import Clinic from "./components/Clinic";
import InfoSections from "./components/InfoSections";

function App() {
  return (
    <div id="top" className="grain min-h-screen">
      <Hero />
      <main>
        <Clinic />
        <InfoSections />
      </main>
    </div>
  );
}

export default App;
