import AutomationForm from "./components/AutomationForm";
import TypewriterLoop from "./components/TypewriterLoop";
import InteractiveEyes from "./components/InteractiveEyes";

export default function Home() {
  return (
    <div className="min-h-screen text-gray-900 relative overflow-hidden">
      <header className="w-full px-4 pt-6 pb-2">
        <h1 className="text-2xl font-serif italic text-gray-900">Access AI</h1>
      </header>
      <main className="container mx-auto py-12 px-4 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center mb-12 w-full">
          
          <InteractiveEyes />

          <div className="text-center">
            {/* Added vertical padding to prevent font clipping of italic descenders/ascenders */}
            <h1 className="text-6xl md:text-8xl tracking-tight text-gray-900 px-8 leading-normal">
              Fix Acccessibility Issues in an instant.
            </h1>
            
            <div className="mt-4 font-semibold">
              {/* <TypewriterLoop /> */}
              Scour your site for accessibility issues and generate actionable tickets.
            </div>
          </div>
        </div>
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
          <AutomationForm />
        </div>
        
      </main>
    </div>
  );
}
