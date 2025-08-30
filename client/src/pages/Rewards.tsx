import { GamefiedRewards } from "@/components/GamefiedRewards";

export default function Rewards() {
  return (
    <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
      <header className="bg-gradient-to-r from-primary to-secondary p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            🎮
          </div>
          <h1 className="text-white font-semibold text-lg">
            Earn & Learn
          </h1>
        </div>
      </header>
      
      <main className="p-4">
        <GamefiedRewards />
      </main>
    </div>
  );
}