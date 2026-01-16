import AutomationForm from "./components/AutomationForm";
import GradientBackground from "./components/GradientBackground";

export default function Home() {
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <GradientBackground />
      
      <main className="container mx-auto py-12 px-4 relative z-10">
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="text-center">
            {/* Added vertical padding to prevent font clipping of italic descenders/ascenders */}
            <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 py-6 leading-tight">
              Accessibility Agent
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto mt-6">
              Automated accessibility testing powered by Mino AI
            </p>
          </div>
        </div>
        
        <AutomationForm />
      </main>
    </div>
  );
}
