// SettingsScreen  -  career stats + data management + preferences.
//   Stats:       playtime, prestiges, lifetime earnings, collection %.
//   Data:        Manual Save · Export (clipboard, base64) · Import (textarea).
//   Danger:      Hard Reset behind a double confirmation.
//   Preferences: buy quantity + sound toggles.

import { useState, useCallback } from 'react';
import { useGame } from '../../game/GameContext';
import { ADVISORS } from '../../data/advisors';
import { MILESTONES } from '../../data/milestones';
import { exportSave, importSave, saveGame } from '../../game/SaveSystem';
import { sfx } from '../../systems/AudioEngine';
import { music, TRACK_PRESETS } from '../../systems/MusicEngine';
import { formatMoney } from '../../utils/bigNumber';
import { formatDuration } from '../../utils/time';
import ShareCardModal from '../shared/ShareCardModal';

const BUY_OPTIONS: (1 | 10 | 100 | 'max')[] = [1, 10, 100, 'max'];

type Banner = { tone: 'good' | 'bad'; text: string } | null;

// ---- SW update hook used for the in-settings update button ------------------
function useSwUpdate() {
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);

  function checkNow() {
    if (!('serviceWorker' in navigator)) return;
    setChecking(true);
    navigator.serviceWorker.ready.then(reg => {
      reg.update().then(() => {
        if (reg.waiting) setPending(true);
        setChecking(false);
      }).catch(() => setChecking(false));
    });
  }

  function applyUpdate() {
    navigator.serviceWorker.ready.then(reg => {
      reg.waiting?.postMessage('SKIP_WAITING');
    });
    setTimeout(() => window.location.reload(), 300);
  }

  // Detect already-waiting SW on mount
  useState(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) { setPending(true); return; }
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            setPending(true);
          }
        });
      });
    });
  });

  return { pending, checking, checkNow, applyUpdate };
}

const MOOD_COLORS: Record<string, string> = {
  Calm:   '#60a5fa',
  Upbeat: '#34d399',
  Focus:  '#a78bfa',
  Tense:  '#fb923c',
};

function MusicPlayerPanel() {
  const [activeId, setActiveId] = useState(() => music.currentTrack().id);
  const [showList, setShowList] = useState(false);

  const current = TRACK_PRESETS.find(t => t.id === activeId) ?? TRACK_PRESETS[0];
  const idx = TRACK_PRESETS.findIndex(t => t.id === activeId);
  const moodColor = MOOD_COLORS[current.mood] ?? '#8a94a8';

  const selectAt = useCallback((i: number) => {
    const t = TRACK_PRESETS[((i % TRACK_PRESETS.length) + TRACK_PRESETS.length) % TRACK_PRESETS.length];
    music.selectTrack(t.id);
    setActiveId(t.id);
  }, []);

  return (
    <div className="mx-3.5 mb-3 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.22)' }}>
      {/* Now playing */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${moodColor}18`, border: `1px solid ${moodColor}35` }}
        >
          🎵
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-[#4d5a72] uppercase tracking-wider mb-0.5">Now Playing</div>
          <div className="text-[13px] font-bold text-[#e7ecf5] truncate">{current.name}</div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${moodColor}20`, color: moodColor }}
          >
            {current.mood}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectAt(idx - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8a94a8] hover:text-[#e7ecf5] transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >‹</button>
          <button
            onClick={() => selectAt(idx + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8a94a8] hover:text-[#e7ecf5] transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >›</button>
          <button
            onClick={() => setShowList(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors text-xs"
            style={{
              background: showList ? `${moodColor}20` : 'rgba(255,255,255,0.05)',
              color: showList ? moodColor : '#8a94a8',
            }}
            title="Browse tracks"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Track list */}
      {showList && (
        <div className="max-h-56 overflow-y-auto no-scrollbar border-t border-white/5">
          {TRACK_PRESETS.map((t, i) => {
            const mc = MOOD_COLORS[t.mood] ?? '#8a94a8';
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors"
                style={{
                  background: isActive ? `${mc}12` : 'transparent',
                  borderLeft: isActive ? `2px solid ${mc}` : '2px solid transparent',
                }}
                onClick={() => selectAt(i)}
              >
                <span className="text-[10px] font-mono text-[#3d4a62] w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-[12px] font-medium" style={{ color: isActive ? mc : '#c4cedd' }}>{t.name}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: `${mc}15`, color: mc }}
                >{t.mood}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* BPM indicator */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2">
        <span className="text-[9px] text-[#3d4a62] uppercase tracking-wider">Tempo</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 3,
                height: 3 + i * 2,
                alignSelf: 'flex-end',
                background: i < Math.round(current.bpmMul * 3) ? moodColor : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-[#4d5a72] ml-auto">{idx + 1}/{TRACK_PRESETS.length}</span>
      </div>
    </div>
  );
}

export default function SettingsScreen() {
  const { state, dispatch } = useGame();
  const [banner, setBanner] = useState<Banner>(null);
  const [importText, setImportText] = useState('');
  const [confirmStage, setConfirmStage] = useState<0 | 1 | 2>(0);
  const [showCard, setShowCard] = useState(false);
  const swUpdate = useSwUpdate();

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

          {/* Music toggle */}
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

          {/* Music player panel */}
          {state.settings.music !== false && (
            <MusicPlayerPanel />
          )}

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

      {/* ---- Game update ---- */}
      <section>
        <SectionTitle>Game Version</SectionTitle>
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5 flex items-center justify-between gap-3">
          <div>
            {swUpdate.pending ? (
              <>
                <div className="text-sm font-semibold text-[#e7ecf5]">Update available</div>
                <div className="text-xs text-[#8a94a8] mt-0.5">
                  A new version of Empire Engine is ready to install.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-[#e7ecf5]">Empire Engine</div>
                <div className="text-xs text-[#8a94a8] mt-0.5">
                  {swUpdate.checking ? 'Checking for updates…' : 'Up to date.'}
                </div>
              </>
            )}
          </div>
          {swUpdate.pending ? (
            <button
              onClick={swUpdate.applyUpdate}
              className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-[#070b12] active:scale-95 transition-transform"
              style={{ background: 'var(--accent)' }}
            >
              🔄 Update Now
            </button>
          ) : (
            <button
              onClick={swUpdate.checkNow}
              disabled={swUpdate.checking}
              className="shrink-0 rounded-xl border border-[#232c3e] px-3 py-2 text-xs font-semibold text-[#8a94a8] hover:text-[#e7ecf5] active:scale-95 transition-transform disabled:opacity-40"
            >
              Check
            </button>
          )}
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
      className="relative shrink-0 active:scale-95"
      style={{
        width: '52px',
        height: '30px',
        borderRadius: '15px',
        background: on ? 'var(--accent)' : '#232c3e',
        transition: 'background 0.2s ease, transform 0.1s ease',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: 0,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.40)',
          transform: on ? 'translateX(25px)' : 'translateX(3px)',
          transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          display: 'block',
        }}
      />
    </button>
  );
}
