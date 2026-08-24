import { VennCanvas } from "@/components/canvas/VennCanvas";

function App() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <section className="flex w-full max-w-6xl items-center justify-center rounded-2xl border border-border bg-white p-8 shadow-sm">
        <VennCanvas />
      </section>
    </main>
  );
}

export default App;
