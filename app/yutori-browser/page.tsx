import YutoriAutomationForm from "../components/YutoriAutomationForm";

export default function YutoriBrowserPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white">
      <main className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Accessibility Agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Test the Mino AI automation API with real-time streaming responses.
          </p>
        </div>
        
        <YutoriAutomationForm />
      </main>
    </div>
  );
}
