// SettingsScreen  -  career stats + data management + preferences.
//   Stats:       playtime, prestiges, lifetime earnings, collection %.
//   Data:        Manual Save · Export (clipboard, base64) · Import (textarea).
//   Danger:      Hard Reset behind a double confirmation.
//   Preferences: buy quantity + sound toggles.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import { ADVISORS } from '../../data/advisors';
import { MILESTONES } from '../../data/milestones';
import { exportSave, importSave, saveGame } from '../../game/SaveSystem';
import { sfx } from '../../systems/AudioEngine';
import { music } from '../../systems/MusicEngine';
import { formatMoney } from '../../utils/bigNumber';
import { formatDuration } from '../../utils/time';
import CofounderCustomizer from './CofounderCustomizer';
import ShareCardModal from '../shared/ShareCardModal';

const BUY_OPTIONS: (1 | 10 | 100 | 'max')[] = [1, 10, 100, 'max'];

type Banner = { tone: 'good' | 'bad'; text: string } | null;

export default function SettingsScreen() {
  const { state, dispatch } = useGame();
  const [banner, setBanner] = useState<Banner>(null);
  const [importText, setImportText] = useState('');
  const [confirmStage, setConfirmStage] = useState<0 | 1 | 2>(0);
  const [showCard, setShowCard] = useState(false);

  const flash = (tone: 'good' | 'bad', text: string) => {
    setBanner({ tone, text });
    setTimeout(() => setBanner(null), 2600);
  };

  // ---- Collection % : advisors recruited + milestones unlocked ----
  const ownedAdvisors = Object.keys(state.advisors.owned).length;
  const totalCollectibles = ADVISORS.length + MILESTONES.length;
  const collected = ownedAdvisors + state.milestones.unlocked.length;
  const collectionPct = totalCollectibles > 0 ? Math.round((collected / totalCollectibles) * 100) : 0;

  // ---- Actions ----
  const onManualSave = () => {
    const ok = saveGame(state);
    flash(ok ? 'good' : 'bad', ok ? 'Game saved.' : 'Save failed.');
  };

  const onExport = async () => {
    const code = exportSave(state);
    if (!code) {
      flash('bad', 'Export failed.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      flash('good', 'Save copied to clipboard.');
    } catch {
      // Clipboard blocked  -  drop it in the import box so it can be copied manually.
      setImportText(code);
      flash('bad', 'Clipboard blocked  -  code placed below.');
    }
  };

  const onImport = () => {
    const trimmed = importText.trim();
    if (!trimmed) {
      flash('bad', 'Paste a save code first.');
      return;
    }
    const parsed = importSave(trimmed);
    if (!parsed) {
      flash('bad', 'That save code is invalid.');
      return;
    }
    dispatch({ type: 'IMPORT', state: parsed });
    setImportText('');
    flash('good', 'Save imported.');
  };

  const onHardReset = () => {
    if (confirmStage < 2) {
      setConfirmStage((s) => (s + 1) as 0 | 1 | 2);
      return;
    }
    dispatch({ type: 'HARD_RESET' });
    setConfirmStage(0);
  };

  const resetLabel =
    confirmStage === 0
      ? 'Hard Reset'
      : confirmStage === 1
        ? 'Are you sure? Tap again'
        : 'Last chance  -  erase everything';

  const stats: { icon: string; label: string; value: string }[] = [
    { icon: '⏱️', label: 'Playtime', value: formatDuration(state.stats.playSeconds) },
    { icon: '🔄', label: 'Prestiges', value: String(state.stats.prestiges) },
    { icon: '💰', label: 'Lifetime earnings', value: formatMoney(state.lifetimeEarnings) },
    { icon: '🏆', label: 'Collection', value: `${collectionPct}%` },
  ];

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-semibold text-[#e7ecf5]">Settings</h1>
        <p className="text-xs text-[#8a94a8]">Stats, save data, and preferences.</p>
      </header>

      {/* Status banner */}
      {banner && (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-sm animate-slide-up ${
            banner.tone === 'good'
              ? 'border-[#34d399]/40 bg-[#34d399]/10 text-[#34d399]'
              : 'border-[#f87171]/40 bg-[#f87171]/10 text-[#f87171]'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* ---- Stats ---- */}
      <section>
        <SectionTitle>Career</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5"
            >
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-[11px] uppercase tracking-wide text-[#8a94a8]">{s.label}</div>
              <div className="font-mono tabular-nums text-base font-semibold text-[#e7ecf5] mt-0.5">
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowCard(true)}
          className="mt-2.5 w-full rounded-2xl border border-[var(--accent)]/45 py-3
            text-sm font-bold text-[var(--accent)] active:scale-[0.98] transition-transform
            hover:bg-[var(--accent)]/10"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
        >
          📸 Share your empire
        </button>
      </section>

      {showCard && <ShareCardModal onClose={() => setShowCard(false)} />}

      {/* ---- Preferences ---- */}
      <section>
        <SectionTitle>Preferences</SectionTitle>
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] divide-y divide-[#232c3e]">
          {/* Buy quantity */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Buy quantity</div>
              <div className="text-xs text-[#8a94a8]">Facilities purchased per tap.</div>
            </div>
            <div className="flex rounded-xl border border-[#232c3e] overflow-hidden">
              {BUY_OPTIONS.map((q) => {
                const on = state.settings.buyQty === q;
                return (
                  <button
                    key={String(q)}
                    onClick={() => dispatch({ type: 'SET_BUYQTY', qty: q })}
                    className={`px-3 py-1.5 text-sm font-semibold tabular-nums active:scale-95 transition-transform ${
                      on
                        ? 'bg-[var(--accent)] text-[#070b12]'
                        : 'bg-transparent text-[#8a94a8] hover:text-[#e7ecf5]'
                    }`}
                  >
                    {q === 'max' ? 'Max' : `×${q}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Sound effects</div>
              <div className="text-xs text-[#8a94a8]">Taps, purchases, and rewards.</div>
            </div>
            <Toggle
              on={state.settings.sound}
              onChange={() => {
                const next = !state.settings.sound;
                // Enable the engine first so the confirming blip is audible.
                if (next) {
                  sfx.setEnabled(true);
                  sfx.play('toggle');
                }
                dispatch({ type: 'SET_SETTINGS', payload: { sound: next } });
              }}
            />
          </div>

          {/* Music */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Music</div>
              <div className="text-xs text-[#8a94a8]">Adaptive procedural soundtrack.</div>
            </div>
            <Toggle
              on={state.settings.music !== false}
              onChange={() => {
                const next = !(state.settings.music !== false);
                if (state.settings.sound) sfx.play('toggle');
                music.setEnabled(next);
                dispatch({ type: 'SET_SETTINGS', payload: { music: next } });
              }}
            />
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Haptics</div>
              <div className="text-xs text-[#8a94a8]">Vibration feedback on supported devices.</div>
            </div>
            <Toggle
              on={state.settings.haptics}
              onChange={() => {
                if (state.settings.sound) sfx.play('toggle');
                dispatch({ type: 'SET_SETTINGS', payload: { haptics: !state.settings.haptics } });
              }}
            />
          </div>

          {/* Reduce motion */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Reduce motion</div>
              <div className="text-xs text-[#8a94a8]">
                Calm the ambient backdrop, particle bursts, and celebrations.
              </div>
            </div>
            <Toggle
              on={state.settings.reduceMotion}
              onChange={() => {
                if (state.settings.sound) sfx.play('toggle');
                dispatch({
                  type: 'SET_SETTINGS',
                  payload: { reduceMotion: !state.settings.reduceMotion },
                });
              }}
            />
          </div>

          {/* Live Empire View */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-sm font-medium text-[#e7ecf5]">Live Empire View</div>
              <div className="text-xs text-[#8a94a8]">
                Watch your city grow  -  animated buildings, workers, and money.
              </div>
            </div>
            <Toggle
              on={state.settings.liveView}
              onChange={() => dispatch({ type: 'TOGGLE_LIVE_VIEW' })}
            />
          </div>
        </div>
      </section>

      {/* ---- Co-founder ---- */}
      <section>
        <SectionTitle>Your Co-Founder</SectionTitle>
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
          <CofounderCustomizer />
        </div>
      </section>

      {/* ---- Data ---- */}
      <section>
        <SectionTitle>Save data</SectionTitle>
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onManualSave}
              className="rounded-xl border border-[#232c3e] bg-[#151c2b] hover:bg-[#1b2334] py-3
                text-sm font-semibold text-[#e7ecf5] active:scale-95 transition-transform"
            >
              💾 Manual Save
            </button>
            <button
              onClick={onExport}
              className="rounded-xl border border-[#232c3e] bg-[#151c2b] hover:bg-[#1b2334] py-3
                text-sm font-semibold text-[#e7ecf5] active:scale-95 transition-transform"
            >
              📤 Export
            </button>
          </div>

          <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
            <label className="text-sm font-medium text-[#e7ecf5]">Import save</label>
            <p className="text-xs text-[#8a94a8] mb-2">
              Paste a base64 save code to overwrite your current game.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste save code…"
              rows={3}
              className="w-full resize-none rounded-xl border border-[#232c3e] bg-[#0e1420] p-2.5
                text-xs font-mono text-[#e7ecf5] placeholder:text-[#8a94a8]
                focus:outline-none focus:border-[var(--accent)] no-scrollbar"
            />
            <button
              onClick={onImport}
              disabled={!importText.trim()}
              className="mt-2 w-full rounded-xl bg-[var(--accent)] text-[#070b12] font-semibold py-2.5
                active:scale-95 transition-transform disabled:opacity-40"
            >
              Import save
            </button>
          </div>
        </div>
      </section>

      {/* ---- Danger ---- */}
      <section>
        <SectionTitle>Danger zone</SectionTitle>
        <div className="rounded-2xl border border-[#f87171]/30 bg-[#f87171]/5 p-3.5">
          <div className="text-sm font-medium text-[#e7ecf5]">Hard reset</div>
          <p className="text-xs text-[#8a94a8] mb-3">
            Permanently erase this empire  -  all progress, prestige, and advisors. This cannot be
            undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onHardReset}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-transform ${
                confirmStage === 0
                  ? 'border border-[#f87171]/50 text-[#f87171] hover:bg-[#f87171]/10'
                  : 'bg-[#f87171] text-[#070b12]'
              }`}
            >
              {resetLabel}
            </button>
            {confirmStage > 0 && (
              <button
                onClick={() => setConfirmStage(0)}
                className="rounded-xl border border-[#232c3e] px-4 py-2.5 text-sm font-semibold
                  text-[#8a94a8] hover:text-[#e7ecf5] active:scale-95 transition-transform"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---- Small local building blocks ----

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-wide text-[#8a94a8] mb-2">{children}</h2>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors active:scale-95 ${
        on ? 'bg-[var(--accent)]' : 'bg-[#232c3e]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
