import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8 sm:p-20 text-center relative overflow-hidden">
      {/* Background Gradient Blob */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-luxury-gold/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex flex-col gap-6 items-center text-center max-w-4xl relative z-10">
        <div className="inline-block px-4 py-1.5 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold text-xs font-mono tracking-widest uppercase mb-4">
          System Initialized
        </div>

        <h1 className="text-5xl sm:text-7xl font-serif tracking-tight text-white mb-6">
          A Dental Clinic That <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-gold-light">Runs Itself.</span>
        </h1>

        <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
          LuxuryDental v2.0 is an autonomous revenue engine.
          AI-driven patient management. Zero friction.
        </p>

        <div className="flex gap-4 mt-10 flex-col sm:flex-row w-full sm:w-auto justify-center">
          <button className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-luxury-gold to-[#B89628] text-luxury-darker font-semibold hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            {user ? 'Enter Dashboard' : 'System Login'}
          </button>

          <button className="px-8 py-3.5 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
            View API Docs
          </button>
        </div>
      </main>

      <footer className="absolute bottom-8 text-text-muted text-xs font-mono tracking-wider">
        STATUS: ONLINE • {user ? 'AUTH: VERIFIED' : 'AUTH: PENDING'} • PHASE: 0
      </footer>
    </div>
  );
}
