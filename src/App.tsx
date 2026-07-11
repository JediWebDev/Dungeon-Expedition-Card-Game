/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GuildScreen } from './components/GuildScreen';
import { DungeonRunner } from './components/DungeonRunner';
import { Shield, Compass, Edit2, Check } from 'lucide-react';

function DashboardContent() {
  const { guild, expedition, activeScreen, setActiveScreen, renameGuild } = useGame();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(guild.name);

  // Edit Guild Name handler
  const handleSaveName = () => {
    if (!editedName.trim()) return;
    renameGuild(editedName.trim());
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col font-serif selection:bg-amber-500/30 selection:text-amber-200 antialiased relative">
      {/* Ambient glowing radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(60,40,30,0.12),transparent)] pointer-events-none z-0"></div>

      {/* 1. TOP STATS RESOURCE BANNER */}
      <header className="bg-stone-900/50 backdrop-blur-md border-b border-stone-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Guild Emblem Vector Badge */}
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-700 rounded-lg flex items-center justify-center text-stone-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Shield size={20} fill="currentColor" className="stroke-none" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                    }}
                    maxLength={22}
                    className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-sm font-bold text-stone-100 max-w-[160px] focus:outline-none focus:border-amber-500 font-sans"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded transition"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h1 className="text-base font-bold text-stone-100 truncate tracking-tight uppercase">
                    {guild.name}
                  </h1>
                  <button
                    onClick={() => {
                      setEditedName(guild.name);
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-500 hover:text-amber-400 transition"
                    title="Rename Guild"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              )}

              {/* Composite Guild Tier Level index */}
              <span className="bg-stone-900 border border-stone-800 text-[10px] text-amber-500 font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                Rank {guild.level}
              </span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5 font-sans font-bold uppercase tracking-[0.15em]">
              Dungeon Expedition Manager
            </p>
          </div>
        </div>

        {/* Global Financial Tallies & Active indicators */}
        <div className="flex items-center gap-6 text-sm font-sans font-bold w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-stone-800 pt-3 sm:pt-0">
          {/* Relic count tally */}
          <div className="flex items-center gap-1.5 text-cyan-400">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded shadow-[0_0_8px_rgba(34,211,238,0.5)] rotate-45 mr-1"></div>
            <span className="text-xs text-stone-400 font-sans uppercase tracking-wider">Relics:</span>
            <span className="text-stone-100 font-bold font-sans tracking-tight text-base">{guild.relics.length}</span>
          </div>

          {/* Gold Coin Treasury pile */}
          <div className="flex items-center gap-2.5 bg-stone-950 border border-stone-800 px-4 py-1.5 rounded text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
            <span className="text-base font-bold tracking-tight text-stone-100 font-sans">
              {guild.gold.toLocaleString()} <span className="text-xs text-amber-500 font-medium">GOLD</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. DUAL COLUMN LAYOUT (SIDEBAR + MAIN COMPONENT VIEWER) */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 relative z-10">
        {/* SIDE NAVIGATION PANEL */}
        <nav className="w-full md:w-56 bg-stone-950 border-r border-stone-800 md:p-4 p-3 flex md:flex-col gap-2 shrink-0 md:justify-start justify-center shadow-[inset_-20px_0_30px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setActiveScreen('guild')}
            className={`flex items-center gap-2.5 py-2.5 px-4 rounded-sm text-xs font-sans font-bold uppercase tracking-wider transition-all w-full border ${
              activeScreen === 'guild'
                ? 'bg-stone-900 border-amber-900/50 text-amber-400 shadow-[inset_0_0_10px_rgba(120,53,4,0.15)]'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
            }`}
          >
            <Shield size={14} className={activeScreen === 'guild' ? 'text-amber-500' : ''} /> Guild Headquarters
          </button>

          <button
            onClick={() => expedition && setActiveScreen('expedition')}
            disabled={!expedition}
            className={`flex items-center justify-between py-2.5 px-4 rounded-sm text-xs font-sans font-bold uppercase tracking-wider transition-all w-full border ${
              activeScreen === 'expedition'
                ? 'bg-stone-900 border-amber-900/50 text-amber-400 shadow-[inset_0_0_10px_rgba(120,53,4,0.15)]'
                : expedition
                ? 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30 cursor-pointer'
                : 'border-transparent text-stone-700 cursor-not-allowed opacity-40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Compass size={14} className={activeScreen === 'expedition' ? 'text-amber-500 animate-pulse' : ''} /> Campaign Gate
            </span>
            {expedition && expedition.status === 'room_active' && (
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping shrink-0" />
            )}
          </button>

          <div className="hidden md:block mt-auto pt-6 border-t border-stone-800 text-[10px] text-stone-500 leading-normal bg-stone-900/20 p-3 rounded border border-stone-800/30 font-sans">
            <span className="font-bold text-stone-300 block mb-1 uppercase tracking-widest font-sans">💡 Manager Tip</span>
            Level up your blacksmith supplier in the Upgrades tab to purchase Epic and Legendary items for your heroes.
          </div>
        </nav>

        {/* PRIMARY VIEWPORT SCREEN PORT */}
        <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-y-auto">
          {activeScreen === 'guild' ? <GuildScreen /> : <DungeonRunner />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <DashboardContent />
    </GameProvider>
  );
}