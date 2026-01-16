import AutomationForm from "./components/AutomationForm";
import GradientBackground from "./components/GradientBackground";
import TypewriterLoop from "./components/TypewriterLoop";
import InteractiveEyes from "./components/InteractiveEyes";

export default function Home() {
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <GradientBackground />
      
      <main className="container mx-auto py-4 px-4 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
        <div className="flex flex-col items-center justify-center mb-6 w-full">
          
          <InteractiveEyes />

          <div className="text-center">
            {/* Added vertical padding to prevent font clipping of italic descenders/ascenders */}
            <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 py-2 px-8 leading-normal">
              Access AI
            </h1>
            
            <div className="mt-4">
              <TypewriterLoop />
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-3xl">
          <AutomationForm />
        </div>
      </main>
    </div>
  );
}
