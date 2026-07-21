/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GuildScreen } from './components/GuildScreen';
import { DungeonRunner } from './components/DungeonRunner';
import { AccountScreen } from './components/AccountScreen';
import { CharacterEquipmentScreen } from './components/character/CharacterEquipmentScreen';
import { GuildHqBackground } from './components/ui/GuildHqBackground';
import { Shield, Edit2, Check } from 'lucide-react';
import { useSession } from './lib/auth-client';
import { UiButton } from './components/ui/UiButton';

function DashboardContent() {
  const {
    guild,
    expedition,
    activeScreen,
    setActiveScreen,
    renameGuild,
    hydrated,
    reloadPersistedState,
    lastActionError,
  } = useGame();
  const { data: session } = useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(guild.name);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-300 flex flex-col items-center justify-center gap-4 font-serif">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse">
          <Shield size={20} fill="currentColor" className="stroke-none" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 font-sans font-bold">
          Loading guild ledger…
        </p>
      </div>
    );
  }

  const handleSaveName = () => {
    if (!editedName.trim()) return;
    renameGuild(editedName.trim());
    setIsEditingName(false);
  };

  const handleAuthChanged = () => {
    void reloadPersistedState();
  };

  const useHqBackground = activeScreen === 'guild' || activeScreen === 'character';

  const shell = (
    <>
      <header className="bg-stone-950/40 backdrop-blur-md border-b border-stone-800/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-3 w-full sm:w-auto">
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

              <span className="bg-stone-900 border border-stone-800 text-[10px] text-amber-500 font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                Rank {guild.level}
              </span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5 font-sans font-bold uppercase tracking-[0.15em]">
              Dungeon Expedition Manager
              {!session?.user && (
                <span className="text-amber-700/80 normal-case tracking-normal font-medium ml-2">
                  · Guest (sign in to save)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-sans font-bold w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-stone-800 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded shadow-[0_0_8px_rgba(34,211,238,0.5)] rotate-45 mr-1"></div>
            <span className="text-xs text-stone-400 font-sans uppercase tracking-wider">Relics:</span>
            <span className="text-stone-100 font-bold font-sans tracking-tight text-base">
              {guild.relics.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5 bg-stone-950 border border-stone-800 px-4 py-1.5 rounded text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
            <span className="text-base font-bold tracking-tight text-stone-100 font-sans">
              {guild.gold.toLocaleString()} <span className="text-xs text-amber-500 font-medium">GOLD</span>
            </span>
          </div>
        </div>
      </header>

      {lastActionError && (
        <div className="bg-red-950/80 border-b border-red-900 px-4 py-2 text-center text-xs font-sans text-red-300 relative z-20">
          {lastActionError}
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 min-h-0 relative z-10">
        <nav className="w-full md:w-60 bg-stone-950/55 backdrop-blur-sm border-r border-stone-800/80 md:p-4 p-3 flex md:flex-col gap-2 shrink-0 md:justify-start justify-center">
          <UiButton
            fullWidth
            size="sm"
            onClick={() => setActiveScreen('guild')}
            variant={activeScreen === 'guild' || activeScreen === 'character' ? 'primary' : 'ghost'}
          >
            Guild Headquarters
          </UiButton>

          <UiButton
            fullWidth
            size="sm"
            onClick={() => expedition && setActiveScreen('expedition')}
            disabled={!expedition}
            variant={activeScreen === 'expedition' ? 'primary' : 'ghost'}
          >
            Campaign Gate
            {expedition && expedition.status === 'room_active' ? (
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping shrink-0" />
            ) : null}
          </UiButton>

          <UiButton
            fullWidth
            size="sm"
            onClick={() => setActiveScreen('account')}
            variant={activeScreen === 'account' ? 'primary' : 'ghost'}
            className="md:mt-auto"
            title="Account"
          >
            Account
            {session?.user ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Signed in" />
            ) : null}
          </UiButton>

          <div className="hidden md:block pt-4 border-t border-stone-800 text-[10px] text-stone-500 leading-normal bg-stone-900/40 p-3 rounded border border-stone-800/30 font-sans">
            <span className="font-bold text-stone-300 block mb-1 uppercase tracking-widest font-sans">
              Manager Tip
            </span>
            {session?.user
              ? 'Click a guild member to open their equipment screen and drag gear from the vault.'
              : 'Open Account to create a login — your guild gold, roster, and expeditions will save to the database.'}
          </div>
        </nav>

        <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-y-auto">
          {activeScreen === 'guild' && <GuildScreen />}
          {activeScreen === 'character' && <CharacterEquipmentScreen />}
          {activeScreen === 'expedition' && <DungeonRunner />}
          {activeScreen === 'account' && <AccountScreen onAuthChanged={handleAuthChanged} />}
        </main>
      </div>
    </>
  );

  if (useHqBackground) {
    return <GuildHqBackground className="font-serif selection:bg-amber-500/30 selection:text-amber-200 antialiased">{shell}</GuildHqBackground>;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col font-serif selection:bg-amber-500/30 selection:text-amber-200 antialiased relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(60,40,30,0.12),transparent)] pointer-events-none z-0" />
      <div className="relative z-10 flex min-h-screen flex-col">{shell}</div>
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
