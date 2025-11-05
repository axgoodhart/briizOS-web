import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useCursor } from "@react-three/drei";
import * as Tone from "tone";
import "./App.css";

const GRID_ROWS = 16;
const GRID_COLS = 16;
const PRISM_DEPTH = 16;
const CUBE_SIZE = 0.9;
const CUBE_SPACING = 0.15;
const INSTRUMENTS = 5;
const EFFECTS = ["REVERB", "INTONATION", "CUTOFF", "ATTACK", "DISTORTION"];
const EFFECT_KEYS = EFFECTS.map((effect) => effect.toLowerCase());
const MODES = [
  "Chromatic",
  "Ionian",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
  "Octatonic",
];
// Generate notes from C0 to F#6 (79 notes total)
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES = (() => {
  const notes = [];
  for (let octave = 0; octave <= 6; octave++) {
    for (let i = 0; i < NOTE_NAMES.length; i++) {
      notes.push(NOTE_NAMES[i]);
      // Stop at F# in octave 6
      if (octave === 6 && i === 6) break;
    }
  }
  return notes;
})();

// Mode definitions and quantization helpers
const MODE_DEFS = {
  Chromatic: { allowed: [0,1,2,3,4,5,6,7,8,9,10,11], map: [0,1,2,3,4,5,6,7,8,9,10,11] },
  Ionian: {
    allowed: [0,2,4,5,7,9,11],
    map: [0,0,2,2,4,5,5,7,7,9,9,11],
  },
  Dorian: { allowed: [0,2,3,5,7,9,10] },
  Phrygian: { allowed: [0,1,3,5,7,8,10] },
  Lydian: { allowed: [0,2,4,6,7,9,11] },
  Mixolydian: { allowed: [0,2,4,5,7,9,10] },
  Aeolian: { allowed: [0,2,3,5,7,8,10] },
  Locrian: { allowed: [0,1,3,5,6,8,10] },
  Octatonic: {
    allowed: [0,1,3,4,6,7,9,10],
    map: [0,1,3,3,4,6,6,7,7,9,10,10],
  },
};

function quantizePitchClass(pc, modeName = "Chromatic") {
  const def = MODE_DEFS[modeName] || MODE_DEFS.Chromatic;
  const p = ((pc % 12) + 12) % 12;
  if (def.map) return def.map[p];
  const allowed = def.allowed || MODE_DEFS.Chromatic.allowed;
  if (allowed.includes(p)) return p;
  // nearest with downward tie-break
  for (let dist = 1; dist < 12; dist += 1) {
    const d = (p - dist + 12) % 12;
    if (allowed.includes(d)) return d;
    const u = (p + dist) % 12;
    if (allowed.includes(u)) return u;
  }
  return p;
}

// Modern gradient colors for instruments
const INSTRUMENT_COLORS = [
  "linear-gradient(135deg, #FF4D4D, #F22B2B)",    // Vibrant Red
  "linear-gradient(135deg, #A06AF9, #8347E0)",    // Rich Purple
  "linear-gradient(135deg, #0ECFFE, #0A9DC7)",    // Electric Cyan
  "linear-gradient(135deg, #2CDD8E, #1FB978)",    // Mint Green
  "linear-gradient(135deg, #FFA94D, #FF8019)"     // Deep Orange
];

// Solid colors for various elements
const INSTRUMENT_SOLID_COLORS = [
  "#ff8787",    // Red
  "#fa6cff",    // Purple
  "#0A9DC7",    // Cyan
  "#38eaa0ff",    // Green
  "#FF8019"     // Orange
];

const INSTRUMENT_SHAPES = ["square", "triangle", "circle", "pentagon", "diamond"];

const INITIAL_VOLUMES = [0.1, 0.4, 0.8, 0.5, 0.7];
const INITIAL_EFFECTS = [
  { reverb: 0.5, intonation: 0.5, cutoff: 0.5, attack: 0.5, distortion: 0.2 },
  { reverb: 0.3, intonation: 0.6, cutoff: 0.4, attack: 0.7, distortion: 0.3 },
  { reverb: 0.6, intonation: 0.7, cutoff: 0.8, attack: 0.3, distortion: 0.1 },
  { reverb: 0.4, intonation: 0.5, cutoff: 0.5, attack: 0.6, distortion: 0.4 },
  { reverb: 0.7, intonation: 0.4, cutoff: 0.7, attack: 0.5, distortion: 0.5 }
];

const INTONATION_RATIO = 1.0293;
const INTONATION_THRESHOLD = 0.5;

function shallowArrayEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function resolveIntonationMultiplier(value = INTONATION_THRESHOLD) {
  if (value > INTONATION_THRESHOLD) {
    return INTONATION_RATIO;
  }
  if (value < INTONATION_THRESHOLD) {
    return 1 / INTONATION_RATIO;
  }
  return 1;
}

export default function App() {
  // State variables
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentInstrument, setCurrentInstrument] = useState(0);
  const gridGroup = 1;
  const [currentMode, setCurrentMode] = useState("Chromatic");
  const [instrumentModes, setInstrumentModes] = useState(Array(INSTRUMENTS).fill("Chromatic"));
  const [activeKeys, setActiveKeys] = useState(Array(NOTES.length).fill(false));
  const [bpm, setBpm] = useState(120);
  const [instrumentEffectView, setInstrumentEffectView] = useState(() => Array(INSTRUMENTS).fill(EFFECT_KEYS[0]));
  const [isEffectMenuOpen, setIsEffectMenuOpen] = useState(false);
  // Keyboard interaction
  const [isKeyboardMapped, setIsKeyboardMapped] = useState(false);
  const [currentOctave, setCurrentOctave] = useState(3); // Start at octave 3 so keyboard-mapped keys are visible
  const [showKeyboardGuide, setShowKeyboardGuide] = useState(false);
  const [showPressTabHint, setShowPressTabHint] = useState(false);

  // Grid state - array of arrays with note information
  const [grid, setGrid] = useState(createEmptyGrid());
  const gridRef = useRef(grid);
  const activeKeysRef = useRef(activeKeys);
  const timelineRef = useRef(null);
  const effectMenuRef = useRef(null);
  const effectMenuButtonRef = useRef(null);

  // Volume building state
  const [volumeBuildState, setVolumeBuildState] = useState(null); // { row, col, step }
  const volumeBuildTimerRef = useRef(null);
  
  // Volume levels for each instrument (0-1)
  const [volumes, setVolumes] = useState(() => [...INITIAL_VOLUMES]);
  
  // Effect levels for each instrument (0-1)
  const [effects, setEffects] = useState(() => INITIAL_EFFECTS.map((effect) => ({ ...effect })));
  const effectsRef = useRef(effects);
  const instrumentModesRef = useRef(instrumentModes);
  
  // Audio objects refs
  const synths = useRef([]);
  const sequencer = useRef(null);
  
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    activeKeysRef.current = activeKeys;
  }, [activeKeys]);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  useEffect(() => {
    instrumentModesRef.current = instrumentModes;
  }, [instrumentModes]);

  // (Keyboard handlers moved below after handleKeyClick to avoid TDZ)

  useEffect(() => {
    if (!isEffectMenuOpen) {
      return undefined;
    }

    function handleDocumentClick(event) {
      if (
        effectMenuRef.current &&
        !effectMenuRef.current.contains(event.target) &&
        effectMenuButtonRef.current &&
        !effectMenuButtonRef.current.contains(event.target)
      ) {
        setIsEffectMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isEffectMenuOpen]);
  
  
  // Initialize audio components
  useEffect(() => {
    // Create synths for each instrument
    synths.current = Array(INSTRUMENTS).fill().map((_, i) => {
      let synth;
      
      // Create different synth types for different instruments
      switch(i) {
                case 0: // Circle - AM synth
          synth = new Tone.PolySynth(Tone.AMSynth).toDestination();
          break;
        case 1: // Square - Basic synth
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'square' }
          }).toDestination();
          break;
        case 2: // Triangle - FM synth
          synth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3.01,
            modulationIndex: 5
          }).toDestination();
          break;
        case 3: // Pentagon - Membrane synth
          synth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            envelope: {
              attack: 0.01,
              decay: 0.8,
              sustain: 0.1,
              release: 1.4
            }
          }).toDestination();
          break;
        case 4: // Diamond - Metal synth
          synth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
              attack: 0.001,
              decay: 0.1,
              release: 0.1
            },
            harmonicity: 3.1,
            modulationIndex: 16,
            resonance: 4000,
            octaves: 1.5
          }).toDestination();
          break;
        default:
          synth = new Tone.PolySynth(Tone.Synth).toDestination();
      }
      
      // Set initial volume
      const initialVolume = INITIAL_VOLUMES[i] ?? 0.5;
      synth.volume.value = Tone.gainToDb(initialVolume);
      
      // Add effects chain for all synths
      const reverb = new Tone.Reverb(3).toDestination();
      const filter = new Tone.Filter(2000, "lowpass").connect(reverb);
      const initialDistortion = INITIAL_EFFECTS[i]?.distortion ?? 0;
      const distortion = new Tone.Distortion(initialDistortion).connect(filter);

      const initialReverb = INITIAL_EFFECTS[i]?.reverb ?? 0.5;
      const initialCutoff = INITIAL_EFFECTS[i]?.cutoff ?? 0.5;
      reverb.wet.value = initialReverb;
      filter.frequency.value = 200 + (initialCutoff * 10000);
      
      // Connect synth to effects chain
      if (i === 3 || i === 4) { // For Membrane and Metal synths
        synth.connect(distortion);
      } else { // For poly synths
        synth.disconnect(); // Disconnect from destination
        synth.connect(distortion); // Connect to effects chain
      }
      
      return { synth, effects: { reverb, filter, distortion } };
    });
    
    // Clean up
    return () => {
      synths.current.forEach(({ synth, effects }) => {
        synth.dispose();
        effects.reverb.dispose();
        effects.filter.dispose();
        effects.distortion.dispose();
      });
    };
  }, []);
  
  // Update effect parameters when they change
  useEffect(() => {
    synths.current.forEach((synthObj, i) => {
      if (synthObj && synthObj.synth) {
        // Update volume
        synthObj.synth.volume.value = Tone.gainToDb(volumes[i]);
        
        // Update effects
        if (synthObj.effects.reverb) {
          synthObj.effects.reverb.wet.value = effects[i].reverb;
        }
        
        // Update filter cutoff (intonation)
        if (synthObj.effects.filter) {
          const cutoffValue = 200 + (effects[i].cutoff * 10000);
          synthObj.effects.filter.frequency.value = cutoffValue;
        }
        
        // Update distortion
        if (synthObj.effects.distortion) {
          synthObj.effects.distortion.distortion = effects[i].distortion;
        }
        
        // Update attack for synths that support it
        if (i < 3) { // Poly synths
          synthObj.synth.set({
            envelope: { 
              attack: 0.01 + (effects[i].attack * 0.5)
            }
          });
        } else if (i === 3) { // Membrane synth
          synthObj.synth.envelope.attack = 0.01 + (effects[i].attack * 0.5);
        } else if (i === 4) { // Metal synth
          synthObj.synth.envelope.attack = 0.001 + (effects[i].attack * 0.2);
        }
      }
    });
  }, [volumes, effects]);
  
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);
  
  const triggerInstrumentNote = useCallback((instrumentIndex, fullNote, duration, time, noteVolume = 1.0) => {
    const instrument = synths.current[instrumentIndex];
    if (!instrument) {
      return;
    }

    if (Tone.context.state !== "running") {
      Tone.start().catch(() => {});
    }

    const instrumentEffects = effectsRef.current?.[instrumentIndex];
    const multiplier = resolveIntonationMultiplier(instrumentEffects?.intonation);
    const frequency = Tone.Frequency(fullNote).toFrequency() * multiplier;
    const now = typeof time === "number" ? time : Tone.now();

    // For PolySynths, use velocity parameter to control per-note volume
    // For MonoSynths, temporarily adjust volume
    if (instrumentIndex < 3) {
      // PolySynths support velocity
      const velocity = noteVolume;
      instrument.synth.triggerAttackRelease(frequency, duration, now, velocity);
    } else {
      // MonoSynths - adjust volume temporarily
      const currentVolume = instrument.synth.volume.value;
      const instrumentBaseVolume = volumes[instrumentIndex] || 0.5;
      const combinedVolume = instrumentBaseVolume * noteVolume;
      instrument.synth.volume.value = Tone.gainToDb(combinedVolume);

      instrument.synth.triggerAttackRelease(frequency, duration, now);

      // Restore volume after note duration
      const durationMs = Tone.Time(duration).toMilliseconds();
      setTimeout(() => {
        instrument.synth.volume.value = currentVolume;
      }, durationMs + 50);
    }
  }, [volumes]);

  // Set up sequencer when play state changes
  useEffect(() => {
    if (isPlaying) {
      if (Tone.context.state !== "running") {
        Tone.start();
      }

      const steps = GRID_COLS;
      const subdivision = "16n";

      if (sequencer.current) {
        sequencer.current.stop();
        sequencer.current.dispose();
      }

      const sequence = new Tone.Sequence(
        (time, step) => {
          const gridState = gridRef.current;
          const nextActiveKeys = Array(NOTES.length).fill(false);

          for (let inst = 0; inst < INSTRUMENTS; inst++) {
            for (let row = 0; row < GRID_ROWS; row++) {
              if (gridState[row][step]?.active && gridState[row][step].instrument === inst) {
                const noteIndex = GRID_ROWS - 1 - row;
                const octave = Math.floor(noteIndex / 12) + 3;
                const modeName = instrumentModesRef.current?.[inst] || currentMode;
                const pc = quantizePitchClass(noteIndex % 12, modeName);
                const note = NOTE_NAMES[pc];
                const fullNote = `${note}${octave}`;
                const cellVolume = gridState[row][step].volume || 1.0;

                // Light up only the key that matches this exact octave
                // Calculate keyboard index: octave 0 → indices 0-11, octave 1 → indices 12-23, etc.
                const keyboardIndex = octave * 12 + pc;
                if (keyboardIndex >= 0 && keyboardIndex < NOTES.length) {
                  nextActiveKeys[keyboardIndex] = true;
                }

                triggerInstrumentNote(inst, fullNote, "16n", time, cellVolume);
              }
            }
          }

          const keysChanged = !shallowArrayEqual(nextActiveKeys, activeKeysRef.current);

          Tone.Draw.schedule(() => {
            setCurrentStep((prev) => (prev === step ? prev : step));

            if (timelineRef.current) {
              const maxIndex = GRID_COLS - 1;
              const progress = maxIndex <= 0 ? 0 : step / maxIndex;
              timelineRef.current.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
            }

            if (keysChanged) {
              activeKeysRef.current = nextActiveKeys;
              setActiveKeys(nextActiveKeys);
            }
          }, time);
        },
        Array.from({ length: steps }, (_, i) => i),
        subdivision
      );

      sequencer.current = sequence;
      sequence.start(0);
      Tone.Transport.start();

      return () => {
        if (sequencer.current) {
          sequencer.current.stop();
          sequencer.current.dispose();
          sequencer.current = null;
        }
        if (Tone.Transport.state === "started") {
          Tone.Transport.stop();
        }
      };
    }

    if (sequencer.current) {
      sequencer.current.stop();
      sequencer.current.dispose();
      sequencer.current = null;
    }
    Tone.Transport.stop();
    setCurrentStep(0);
    setActiveKeys((prevKeys) => {
      if (prevKeys.some(Boolean)) {
        return Array(NOTES.length).fill(false);
      }
      return prevKeys;
    });

    if (timelineRef.current) {
      timelineRef.current.style.transform = "scaleX(0)";
    }

    return undefined;
  }, [isPlaying, triggerInstrumentNote]);
  
  // Helper to create empty grid
  function createEmptyGrid() {
    return Array(GRID_ROWS).fill().map(() =>
      Array(GRID_COLS).fill().map(() => ({ active: false, instrument: null, volume: 1.0 }))
    );
  }
  
  // Handle grid cell click
  const handleGridClick = useCallback((row, col) => {
    // Always preview the note for this row (regardless of toggle state)
    const noteIndex = GRID_ROWS - 1 - row;
    const octave = Math.floor(noteIndex / 12) + 3;
    const modeName = instrumentModes[currentInstrument] || currentMode;
    const pc = quantizePitchClass(noteIndex % 12, modeName);
    const note = NOTE_NAMES[pc];
    const fullNote = `${note}${octave}`;
    triggerInstrumentNote(currentInstrument, fullNote, "16n");

    // Toggle the cell state for sequencing
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((gridRow, r) => (r === row ? [...gridRow] : gridRow));
      const existing = prevGrid[row][col];
      nextGrid[row][col] = existing?.active
        ? { active: false, instrument: null, volume: 1.0 }
        : { active: true, instrument: currentInstrument, volume: volumes[currentInstrument] || 1.0 };
      return nextGrid;
    });
  }, [currentInstrument, triggerInstrumentNote, instrumentModes, currentMode, volumes]);

  // Handle cell hold start for volume building
  const handleCellHoldStart = useCallback((row, col) => {
    // Clear any existing timer
    if (volumeBuildTimerRef.current) {
      clearInterval(volumeBuildTimerRef.current);
    }

    // Set initial volume to minimum
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((gridRow, r) => (r === row ? [...gridRow] : gridRow));
      nextGrid[row][col] = {
        active: true,
        instrument: currentInstrument,
        volume: 1 / 16 // Start at minimum (step 1 of 16)
      };
      return nextGrid;
    });

    // Start building volume
    setVolumeBuildState({ row, col, step: 1 });

    // Increment volume every 150ms
    volumeBuildTimerRef.current = setInterval(() => {
      setVolumeBuildState((prev) => {
        if (!prev || prev.step >= 16) {
          if (volumeBuildTimerRef.current) {
            clearInterval(volumeBuildTimerRef.current);
          }
          return prev;
        }

        const newStep = prev.step + 1;
        const newVolume = newStep / 16;

        setGrid((prevGrid) => {
          const nextGrid = prevGrid.map((gridRow, r) => (r === prev.row ? [...gridRow] : gridRow));
          if (nextGrid[prev.row][prev.col].active) {
            nextGrid[prev.row][prev.col] = {
              ...nextGrid[prev.row][prev.col],
              volume: newVolume
            };
          }
          return nextGrid;
        });

        return { ...prev, step: newStep };
      });
    }, 150);
  }, [currentInstrument]);

  // Handle cell hold end
  const handleCellHoldEnd = useCallback(() => {
    if (volumeBuildTimerRef.current) {
      clearInterval(volumeBuildTimerRef.current);
      volumeBuildTimerRef.current = null;
    }
    setVolumeBuildState(null);
  }, []);
  
  // Handle keyboard key click
  const handleKeyClick = useCallback((noteIndex) => {
    const normalizedIndex = noteIndex % 12;
    const octave = Math.floor(noteIndex / 12);
    const modeName = instrumentModes[currentInstrument] || currentMode;
    const pc = quantizePitchClass(normalizedIndex, modeName);
    const note = NOTE_NAMES[pc];
    const fullNote = `${note}${octave}`;

    setActiveKeys((prev) => {
      if (prev[noteIndex]) {
        return prev;
      }
      const updated = [...prev];
      updated[noteIndex] = true;
      return updated;
    });

    triggerInstrumentNote(currentInstrument, fullNote, "8n");

    setTimeout(() => {
      setActiveKeys((prev) => {
        if (!prev[noteIndex]) {
          return prev;
        }
        const updated = [...prev];
        updated[noteIndex] = false;
        return updated;
      });
    }, 200);

    // Only record to grid if the note is within grid range (octave 3-4)
    if (isRecording && isPlaying && octave >= 3 && octave <= 4) {
      const rowIndex = GRID_ROWS - 1 - normalizedIndex;
      setGrid((prevGrid) => {
        const nextGrid = prevGrid.map((gridRow, rIndex) => (rIndex === rowIndex ? [...gridRow] : gridRow));
        nextGrid[rowIndex][currentStep] = { active: true, instrument: currentInstrument };
        return nextGrid;
      });
    }
  }, [currentInstrument, currentStep, isPlaying, isRecording, triggerInstrumentNote, instrumentModes, currentMode]);

  // Global keyboard controls and piano mapping (after handleKeyClick)
  useEffect(() => {
    // Note key mappings within an octave (offset by currentOctave)
    const noteKeyMap = new Map([
      ["a", 0],   // C
      ["w", 1],   // C#
      ["s", 2],   // D
      ["e", 3],   // D#
      ["d", 4],   // E
      ["f", 5],   // F
      ["t", 6],   // F#
      ["g", 7],   // G
      ["y", 8],   // G#
      ["h", 9],   // A
      ["u", 10],  // A# / Bb
      ["j", 11],  // B
      ["k", 12],  // C (second octave)
      ["o", 13],  // C#
      ["l", 14],  // D
      ["p", 15],  // D#
      [";", 16],  // E
      ["'", 17],  // F
      ["[", 18],  // F#
    ]);

    function handleKeyDown(e) {
      // Panic: ESC — immediate stop
      if (e.key === "Escape") {
        e.preventDefault();
        try { Tone.Transport.stop(); } catch (_) {}
        setIsPlaying(false);
        setIsRecording(false);
        setCurrentStep(0);
        setActiveKeys(Array(NOTES.length).fill(false));
        return;
      }

      // Toggle keyboard mapping with Tab
      if (e.key === "Tab") {
        e.preventDefault();
        setIsKeyboardMapped((prev) => !prev);
        return;
      }

      // Octave navigation: Z (down) and X (up)
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        setCurrentOctave((prev) => Math.max(0, prev - 1));
        return;
      }

      if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        setCurrentOctave((prev) => {
          // Calculate max octave: total notes is 79 (C0-F#6)
          // Each octave has 12 notes, white keys ~48px each
          // Approximate viewport width at ~95vw, assume ~1800px max
          // Visible keys: ~37 keys at a time (1800 / 48)
          // Max shift: (79 - 37) / 12 ≈ 3.5 octaves
          // But we have incomplete octave at end, so cap at octave that shows F#6
          const totalNotes = NOTES.length; // 79
          const visibleKeysApprox = 37; // conservative estimate
          const maxOctaveShift = Math.floor((totalNotes - visibleKeysApprox) / 12);
          return Math.min(maxOctaveShift, prev + 1);
        });
        return;
      }

      // Media play/pause (KeyboardEvent.code)
      if (e.code === "MediaPlayPause") {
        setIsPlaying((prev) => !prev);
        return;
      }

      // Spacebar: toggle play/pause
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        return;
      }

      // If mapping enabled, map letter keys to piano
      if (isKeyboardMapped) {
        const key = e.key.toLowerCase();
        if (noteKeyMap.has(key)) {
          e.preventDefault();
          const relativeIndex = noteKeyMap.get(key);
          // Calculate absolute index based on current octave
          const absoluteIndex = currentOctave * 12 + relativeIndex;
          if (absoluteIndex >= 0 && absoluteIndex < NOTES.length) {
            handleKeyClick(absoluteIndex);
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyClick, isKeyboardMapped, currentOctave]);
  
  // Handle volume change
  function handleVolumeChange(instrumentIndex, newValue) {
    const newVolumes = [...volumes];
    newVolumes[instrumentIndex] = newValue;
    setVolumes(newVolumes);
  }
  
  // Handle effect change
  function handleEffectChange(instrumentIndex, effectName, newValue) {
    const newEffects = [...effects];
    newEffects[instrumentIndex] = {
      ...newEffects[instrumentIndex],
      [effectName.toLowerCase()]: newValue
    };
    setEffects(newEffects);
  }

  const cycleInstrumentEffectView = useCallback((instrumentIndex) => {
    setInstrumentEffectView((prev) => {
      const next = [...prev];
      const currentKey = next[instrumentIndex];
      const currentIndex = EFFECT_KEYS.indexOf(currentKey);
      const nextIndex = (currentIndex + 1) % EFFECT_KEYS.length;
      next[instrumentIndex] = EFFECT_KEYS[nextIndex];
      return next;
    });
  }, []);

  const handleSelectGlobalEffect = useCallback((effectKey) => {
    setInstrumentEffectView(Array(INSTRUMENTS).fill(effectKey));
    setIsEffectMenuOpen(false);
  }, []);
  
  // Render the app
  const appDynamicStyles = useMemo(() => ({
    "--active-instrument-gradient": INSTRUMENT_COLORS[currentInstrument],
    "--active-instrument-solid": INSTRUMENT_SOLID_COLORS[currentInstrument],
  }), [currentInstrument]);

  return (
    <div className="app-root" style={appDynamicStyles}>
      <div className="app-layout">
        {/* Top control bar */}
        <header className="app-header">
          <div className="control-bar">
            <button
              onClick={() => setIsPlaying(true)}
              className="control-button"
              disabled={isPlaying}
              style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)" }}
            >
              <div className="play-icon" />
            </button>

            <button
              onClick={() => setIsPlaying(false)}
              className="control-button"
              disabled={!isPlaying}
              style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)" }}
            >
              <div className="stop-icon">
                <div className="stop-bar" />
                <div className="stop-bar" />
              </div>
            </button>

            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`control-button record-button ${isRecording ? "record-button--active" : ""}`}
              style={{ boxShadow: isRecording ? "0 0 15px rgba(255, 0, 0, 0.5)" : "0 4px 10px rgba(0, 0, 0, 0.5)" }}
            >
              <div className={`record-indicator ${isRecording ? "record-indicator--active" : ""}`} />
            </button>

            <div className="timeline">
              <div className="timeline-progress" ref={timelineRef} />
            </div>

            <div className="bpm-control">
              <div className="bpm-label">BPM</div>
              <div className="bpm-slider-wrapper">
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="1"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="range-input range-input--bpm"
                />
                <div
                  className="range-progress range-progress--bpm"
                  style={{
                    width: `${((bpm - 60) / 120) * 100}%`,
                    boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                  }}
                />
              </div>
              <div className="bpm-value">{bpm}</div>
            </div>

            <div className="grid-group-indicator">{gridGroup}</div>
          </div>
        </header>

        {/* Main content area */}
        <div className="app-main">
          {/* Left panel - volume and effects */}
          <aside className="sidebar">
            <div className="section-title">Volume</div>

            {/* Volume sliders */}
            {INSTRUMENT_SHAPES.map((shape, i) => (
              <div key={`vol-${i}`} className="volume-item">
                <div
                  className="volume-shape"
                  style={{ background: "transparent" }}
                >
                  {renderShape(shape, INSTRUMENT_SOLID_COLORS[i])}
                </div>

                <div
                  className="slider-container"
                  style={{ "--slider-color": INSTRUMENT_SOLID_COLORS[i] }}
                >
                  <div className="slider-track">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.005"
                      value={volumes[i]}
                      onChange={(e) => handleVolumeChange(i, parseFloat(e.target.value))}
                      className="range-input"
                    />
                    <div
                      className="range-progress"
                      style={{
                        "--progress": volumes[i],
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="instrument-selector">
              {INSTRUMENT_SHAPES.map((shape, i) => {
                const isActiveInstrument = currentInstrument === i;
                const className = [
                  "instrument-selector-item",
                  isActiveInstrument ? "instrument-selector-item--active" : "",
                ].filter(Boolean).join(" ");

                return (
                  <button
                    key={`instrument-${i}`}
                    onClick={() => setCurrentInstrument(i)}
                    className={className}
                    style={{ "--instrument-color": INSTRUMENT_SOLID_COLORS[i] }}
                  >
                    {renderShape(shape, INSTRUMENT_SOLID_COLORS[i])}
                    {isActiveInstrument && <span className="instrument-selector-indicator" />}
                  </button>
                );
              })}
            </div>

            {/* Effect sliders */}
          <div className="effects-group">
            <div className="effects-header">
              <div className="section-title section-title--small">Effects</div>
              <div className="effects-header-actions">
                <button
                  type="button"
                  className="effects-menu-button"
                  onClick={() => setIsEffectMenuOpen((prev) => !prev)}
                  ref={effectMenuButtonRef}
                  aria-haspopup="listbox"
                  aria-expanded={isEffectMenuOpen}
                >
                  <span className="effects-menu-icon" />
                </button>
                {isEffectMenuOpen && (
                  <div className="effects-menu" ref={effectMenuRef} role="listbox">
                    {EFFECT_KEYS.map((effectKey) => (
                      <button
                        key={`effect-menu-${effectKey}`}
                        type="button"
                        className="effects-menu-item"
                        onClick={() => handleSelectGlobalEffect(effectKey)}
                      >
                        {EFFECTS[EFFECT_KEYS.indexOf(effectKey)]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {INSTRUMENT_SHAPES.map((shape, instrumentIndex) => {
              const effectKey = instrumentEffectView[instrumentIndex];
              const effectLabel = EFFECTS[EFFECT_KEYS.indexOf(effectKey)] ?? effectKey.toUpperCase();
              const sliderColor = INSTRUMENT_SOLID_COLORS[instrumentIndex];
              const effectValue = effects[instrumentIndex][effectKey];
              const isIntonation = effectKey === "intonation";
              const intonationMode = isIntonation
                ? (effectValue > INTONATION_THRESHOLD ? "plus" : effectValue < INTONATION_THRESHOLD ? "minus" : "neutral")
                : null;

              return (
                <div key={`instrument-effect-${instrumentIndex}`} className="instrument-effect-row">
                  <button
                    type="button"
                    className="instrument-effect-shape"
                    style={{ "--instrument-color": sliderColor }}
                    onClick={() => cycleInstrumentEffectView(instrumentIndex)}
                    title="Cycle instrument effect"
                  >
                    {renderShape(shape, sliderColor)}
                  </button>

                  <div className="instrument-effect-controls">
                    <div className="instrument-effect-label">{effectLabel}</div>
                    {isIntonation ? (
                      <div
                        className="slider-container slider-container--intonation"
                        style={{ "--slider-color": sliderColor }}
                      >
                        <div className="slider-track">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.5"
                            value={effectValue}
                            onChange={(e) => handleEffectChange(
                              instrumentIndex,
                              "intonation",
                              parseFloat(e.target.value)
                            )}
                            className="range-input range-input--intonation"
                          />
                        </div>
                        <div className="intonation-stops">
                          <span className={`intonation-stop ${intonationMode === "minus" ? "intonation-stop--active" : ""}`}>-</span>
                          <span className={`intonation-stop ${intonationMode === "neutral" ? "intonation-stop--active" : ""}`}>0</span>
                          <span className={`intonation-stop ${intonationMode === "plus" ? "intonation-stop--active" : ""}`}>+</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="slider-container"
                        style={{ "--slider-color": sliderColor }}
                      >
                        <div className="slider-track">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.005"
                            value={effectValue}
                            onChange={(e) => handleEffectChange(
                              instrumentIndex,
                              effectKey,
                              parseFloat(e.target.value)
                            )}
                            className="range-input"
                          />
                          <div
                            className="range-progress range-progress--effect"
                            style={{ "--progress": effectValue }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

            <div className="sidebar-footer">
              <div className="sidebar-footer-title">Grid Group</div>
              <div className="sidebar-footer-value">{gridGroup}</div>
            </div>
          </aside>

          {/* Middle area - grid sequencer */}
          <section className="app-content">
            <div className="sequencer-panel">
              <div className="sequencer-container">
                <div className="sequencer-prism">
                  <SequencerPrism
                    grid={grid}
                    onCellClick={handleGridClick}
                    onCellHoldStart={handleCellHoldStart}
                    onCellHoldEnd={handleCellHoldEnd}
                    volumeBuildState={volumeBuildState}
                    currentStep={currentStep}
                    isPlaying={isPlaying}
                  />
                </div>
              </div>

              {/* Mode selection */}
              <div className="mode-bar">
                <button
                  className="mode-button"
                  onClick={() => {
                    const currentIndex = MODES.indexOf(currentMode);
                    const newIndex = (currentIndex - 1 + MODES.length) % MODES.length;
                    setCurrentMode(MODES[newIndex]);

                    // Also update for current instrument
                    const newInstrumentModes = [...instrumentModes];
                    newInstrumentModes[currentInstrument] = MODES[newIndex];
                    setInstrumentModes(newInstrumentModes);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="mode-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="mode-title">{currentMode} Mode</div>

                <button
                  className="mode-button"
                  onClick={() => {
                    const currentIndex = MODES.indexOf(currentMode);
                    const newIndex = (currentIndex + 1) % MODES.length;
                    setCurrentMode(MODES[newIndex]);

                    // Also update for current instrument
                    const newInstrumentModes = [...instrumentModes];
                    newInstrumentModes[currentInstrument] = MODES[newIndex];
                    setInstrumentModes(newInstrumentModes);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="mode-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom keyboard */}
        <footer className="app-footer">
          <div className="keyboard-controls">
            <button
              className={`keyboard-guide-button ${showKeyboardGuide ? "keyboard-guide-button--active" : ""}`}
              onClick={() => {
                if (!isKeyboardMapped) {
                  // Flash the hint if they try to toggle guide when keyboard is off
                  setShowPressTabHint(true);
                  setTimeout(() => setShowPressTabHint(false), 3000);
                }
                setShowKeyboardGuide(!showKeyboardGuide);
              }}
              title="Show keyboard guide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="137.142857" height="82.285714" version="1.1" viewBox="0 0 137.142857 82.285714">
                <path d="M27.428571 56.000000 L27.428571 62.857143 C27.428571 63.619051 27.047623 64.000000 26.285714 64.000000 L19.428571 64.000000 C18.666663 64.000000 18.285714 63.619051 18.285714 62.857143 L18.285714 56.000000 C18.285714 55.238091 18.666663 54.857143 19.428571 54.857143 L26.285714 54.857143 C27.047623 54.857143 27.428571 55.238091 27.428571 56.000000 Z M36.571429 37.714286 L36.571429 44.571429 C36.571429 45.333337 36.190480 45.714286 35.428571 45.714286 L19.428571 45.714286 C18.666663 45.714286 18.285714 45.333337 18.285714 44.571429 L18.285714 37.714286 C18.285714 36.952377 18.666663 36.571429 19.428571 36.571429 L35.428571 36.571429 C36.190480 36.571429 36.571429 36.952377 36.571429 37.714286 Z M27.428571 19.428571 L27.428571 26.285714 C27.428571 27.047623 27.047623 27.428571 26.285714 27.428571 L19.428571 27.428571 C18.666663 27.428571 18.285714 27.047623 18.285714 26.285714 L18.285714 19.428571 C18.285714 18.666663 18.666663 18.285714 19.428571 18.285714 L26.285714 18.285714 C27.047623 18.285714 27.428571 18.666663 27.428571 19.428571 Z M100.571429 56.000000 L100.571429 62.857143 C100.571429 63.619051 100.190480 64.000000 99.428571 64.000000 L37.714286 64.000000 C36.952377 64.000000 36.571429 63.619051 36.571429 62.857143 L36.571429 56.000000 C36.571429 55.238091 36.952377 54.857143 37.714286 54.857143 L99.428571 54.857143 C100.190480 54.857143 100.571429 55.238091 100.571429 56.000000 Z M54.857143 37.714286 L54.857143 44.571429 C54.857143 45.333337 54.476194 45.714286 53.714286 45.714286 L46.857143 45.714286 C46.095234 45.714286 45.714286 45.333337 45.714286 44.571429 L45.714286 37.714286 C45.714286 36.952377 46.095234 36.571429 46.857143 36.571429 L53.714286 36.571429 C54.476194 36.571429 54.857143 36.952377 54.857143 37.714286 Z M45.714286 19.428571 L45.714286 26.285714 C45.714286 27.047623 45.333337 27.428571 44.571429 27.428571 L37.714286 27.428571 C36.952377 27.428571 36.571429 27.047623 36.571429 26.285714 L36.571429 19.428571 C36.571429 18.666663 36.952377 18.285714 37.714286 18.285714 L44.571429 18.285714 C45.333337 18.285714 45.714286 18.666663 45.714286 19.428571 Z M73.142857 37.714286 L73.142857 44.571429 C73.142857 45.333337 72.761909 45.714286 72.000000 45.714286 L65.142857 45.714286 C64.380949 45.714286 64.000000 45.333337 64.000000 44.571429 L64.000000 37.714286 C64.000000 36.952377 64.380949 36.571429 65.142857 36.571429 L72.000000 36.571429 C72.761909 36.571429 73.142857 36.952377 73.142857 37.714286 Z M64.000000 19.428571 L64.000000 26.285714 C64.000000 27.047623 63.619051 27.428571 62.857143 27.428571 L56.000000 27.428571 C55.238091 27.428571 54.857143 27.047623 54.857143 26.285714 L54.857143 19.428571 C54.857143 18.666663 55.238091 18.285714 56.000000 18.285714 L62.857143 18.285714 C63.619051 18.285714 64.000000 18.666663 64.000000 19.428571 Z M91.428571 37.714286 L91.428571 44.571429 C91.428571 45.333337 91.047623 45.714286 90.285714 45.714286 L83.428571 45.714286 C82.666663 45.714286 82.285714 45.333337 82.285714 44.571429 L82.285714 37.714286 C82.285714 36.952377 82.666663 36.571429 83.428571 36.571429 L90.285714 36.571429 C91.047623 36.571429 91.428571 36.952377 91.428571 37.714286 Z M118.857143 56.000000 L118.857143 62.857143 C118.857143 63.619051 118.476194 64.000000 117.714286 64.000000 L110.857143 64.000000 C110.095234 64.000000 109.714286 63.619051 109.714286 62.857143 L109.714286 56.000000 C109.714286 55.238091 110.095234 54.857143 110.857143 54.857143 L117.714286 54.857143 C118.476194 54.857143 118.857143 55.238091 118.857143 56.000000 Z M82.285714 19.428571 L82.285714 26.285714 C82.285714 27.047623 81.904766 27.428571 81.142857 27.428571 L74.285714 27.428571 C73.523806 27.428571 73.142857 27.047623 73.142857 26.285714 L73.142857 19.428571 C73.142857 18.666663 73.523806 18.285714 74.285714 18.285714 L81.142857 18.285714 C81.904766 18.285714 82.285714 18.666663 82.285714 19.428571 Z M100.571429 19.428571 L100.571429 26.285714 C100.571429 27.047623 100.190480 27.428571 99.428571 27.428571 L92.571429 27.428571 C91.809520 27.428571 91.428571 27.047623 91.428571 26.285714 L91.428571 19.428571 C91.428571 18.666663 91.809520 18.285714 92.571429 18.285714 L99.428571 18.285714 C100.190480 18.285714 100.571429 18.666663 100.571429 19.428571 Z M118.857143 19.428571 L118.857143 44.571429 C118.857143 45.333337 118.476194 45.714286 117.714286 45.714286 L101.714286 45.714286 C100.952377 45.714286 100.571429 45.333337 100.571429 44.571429 L100.571429 37.714286 C100.571429 36.952377 100.952377 36.571429 101.714286 36.571429 L109.714286 36.571429 L109.714286 19.428571 C109.714286 18.666663 110.095234 18.285714 110.857143 18.285714 L117.714286 18.285714 C118.476194 18.285714 118.857143 18.666663 118.857143 19.428571 Z M128.000000 73.142857 L128.000000 9.142857 L9.142857 9.142857 L9.142857 73.142857 Z M137.142857 9.142857 L137.142857 73.142857 C137.142857 75.666679 136.250009 77.821420 134.464286 79.607143 C132.678562 81.392866 130.523822 82.285714 128.000000 82.285714 L9.142857 82.285714 C6.619035 82.285714 4.464295 81.392866 2.678571 79.607143 C0.892848 77.821420 0.000000 75.666679 0.000000 73.142857 L0.000000 9.142857 C0.000000 6.619035 0.892848 4.464295 2.678571 2.678571 C4.464295 0.892848 6.619035 -0.000000 9.142857 -0.000000 L128.000000 -0.000000 C130.523822 -0.000000 132.678562 0.892848 134.464286 2.678571 C136.250009 4.464295 137.142857 6.619035 137.142857 9.142857 Z M137.142857 82.285714"/>
              </svg>
            </button>
            <div
              className={`keyboard-indicator ${isKeyboardMapped ? "keyboard-indicator--on" : ""}`}
              title={`Keyboard mapping ${isKeyboardMapped ? "ON" : "OFF"} (toggle: Tab) | Octave: ${currentOctave} (Z/X to change)`}
              aria-label="Keyboard mapping indicator"
            />
            {showPressTabHint && (
              <div className="press-tab-hint">
                PRESS TAB
              </div>
            )}
          </div>
          <div className="keyboard">
            <div className="keyboard-keys-container">
              <div
                className="keyboard-keys"
                style={{
                  transform: `translateX(-${currentOctave * 12 * 48}px)`,
                  transition: 'transform 0.3s ease-out'
                }}
              >
                {NOTES.map((note, i) => {
                  const modeName = instrumentModes[currentInstrument] || currentMode;
                  const noteIndex = i % 12;
                  const mapped = quantizePitchClass(noteIndex, modeName);
                  const isNative = mapped === noteIndex; // not remapped by mode
                  const isC = noteIndex === 0;

                  // Check if this key is in the keyboard-mapped range (1.5 octaves starting from currentOctave)
                  const keyboardStartIndex = currentOctave * 12;
                  const keyboardEndIndex = keyboardStartIndex + 19; // 19 keys = 1.5 octaves
                  const isKeyboardMapped = i >= keyboardStartIndex && i < keyboardEndIndex;

                  return (
                  <PianoKey
                    key={`key-${i}`}
                    note={note}
                    index={i}
                    isBlackKey={note.includes('#')}
                    isActive={activeKeys[i]}
                    decorateC={isKeyboardMapped && isC}
                    nativeOverlay={isNative}
                    isInKeyboardRange={isKeyboardMapped}
                    currentInstrument={currentInstrument}
                    isKeyboardMapped={isKeyboardMapped}
                    showKeyboardGuide={showKeyboardGuide}
                    currentOctave={currentOctave}
                    onPress={handleKeyClick}
                  />
                );})}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SequencerPrism({ grid, onCellClick, onCellHoldStart, onCellHoldEnd, volumeBuildState, currentStep, isPlaying }) {
  const cubeData = useMemo(() => {
    const stepSpacing = CUBE_SIZE + CUBE_SPACING;
    const totalWidth = (GRID_COLS - 1) * stepSpacing;
    const totalHeight = (GRID_ROWS - 1) * stepSpacing;
    const totalDepth = (PRISM_DEPTH - 1) * stepSpacing;
    const originX = totalWidth / 2;
    const originY = totalHeight / 2;
    const originZ = totalDepth / 2;
    const depthShades =[
  "#852A2A",
  "#854C2A",
  "#856D2A",
  "#7C852A",
  "#62852A",
  "#49852A",
  "#2A854C",
  "#2A856D",
  "#2A7C85",
  "#2A6285",
  "#2A4985",
  "#4C2A85",
  "#6D2A85",
  "#852A7C",
  "#852A62",
  "#852A49"
]
    const frontIdleColor = "#852A2A";

    const cells = [];

    for (let depth = 0; depth < PRISM_DEPTH; depth += 1) {
      const depthColor = depthShades[Math.min(depth, depthShades.length - 1)];
      for (let row = 0; row < GRID_ROWS; row += 1) {
        for (let col = 0; col < GRID_COLS; col += 1) {
          const isFront = depth === 0;
          const cell = grid[row][col];
          const isActive = Boolean(isFront && cell?.active);
          const instrumentIndex = isActive ? cell.instrument : null;
          const instrumentColor = instrumentIndex != null
            ? INSTRUMENT_SOLID_COLORS[instrumentIndex]
            : undefined;
          const isCurrentColumn = isFront && isPlaying && currentStep === col;
          const cellVolume = cell?.volume || 1.0;
          const volumeStep = Math.floor(cellVolume * 16); // Convert 0-1 to 0-16

          // Check if this cell is in the same row as the volume building cell
          const isVolumeBuilding = volumeBuildState?.row === row && volumeBuildState?.col === col;
          const isSameRow = volumeBuildState?.row === row;
          const shouldHighlight = isSameRow && depth < volumeStep && cell?.active;
          const shouldDim = volumeBuildState && !isSameRow;

          cells.push({
            key: `${depth}-${row}-${col}`,
            position: [
              col * stepSpacing - originX,
              originY - row * stepSpacing,
              originZ - depth * stepSpacing,
            ],
            row,
            col,
            depth,
            isFront,
            isActive,
            instrumentColor,
            baseColor: isFront ? frontIdleColor : depthColor,
            isCurrentColumn,
            isVolumeBuilding,
            shouldHighlight,
            shouldDim,
            volumeStep,
          });
        }
      }
    }

    return cells;
  }, [grid, currentStep, isPlaying, volumeBuildState]);

  const cameraPosition = useMemo(() => [
    GRID_COLS * 0.45,
    GRID_ROWS * 0.55,
    PRISM_DEPTH * 3.2,
  ], []);

  return (
    <Canvas
      className="sequencer-canvas"
      shadows
      camera={{ position: cameraPosition, fov: 45, near: 0.1, far: 2000 }}
    >
      <color attach="background" args={["#000"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[20, 30, 18]}
        intensity={1.15}
        color="#cbd5f5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <group position={[0, 0, 0]}>
        {cubeData.map((cube) => (
          cube.isFront ? (
            <FrontCube
              key={cube.key}
              data={cube}
              onCellClick={onCellClick}
              onCellHoldStart={onCellHoldStart}
              onCellHoldEnd={onCellHoldEnd}
            />
          ) : (
            <mesh
              key={cube.key}
              position={cube.position}
              scale={0.98}
              castShadow={false}
              receiveShadow
            >
              <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
              <meshStandardMaterial
                color={cube.shouldHighlight ? cube.instrumentColor : cube.baseColor}
                emissive={cube.shouldHighlight ? cube.instrumentColor : "#070c18"}
                emissiveIntensity={cube.shouldHighlight ? 0.5 : 0.05}
                roughness={0.55}
                metalness={0.1}
                opacity={cube.shouldDim ? 0.1 : 1.0}
                transparent={cube.shouldDim}
              />
            </mesh>
          )
        ))}
      </group>
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(Math.PI * 0.8)}
        minDistance={12}
        maxDistance={40}
      />
    </Canvas>
  );
}

function FrontCube({ data, onCellClick, onCellHoldStart, onCellHoldEnd }) {
  const {
    row,
    col,
    position,
    isActive,
    instrumentColor,
    baseColor,
    isCurrentColumn,
    isVolumeBuilding,
    shouldDim,
  } = data;
  const [hovered, setHovered] = useState(false);
  const holdTimerRef = useRef(null);

  useCursor(hovered);

  const displayColor = isActive ? instrumentColor : baseColor;
  const emissiveColor = isCurrentColumn
    ? "#8ecaff"
    : isActive
      ? instrumentColor
      : "#070c18";
  const emissiveIntensity = isCurrentColumn ? 0.75 : isActive ? 0.32 : 0.1;
  const scale = isCurrentColumn ? 1.08 : hovered ? 1.04 : isActive ? 1.02 : 1;
  const opacity = shouldDim ? 0.1 : 1.0;

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();

    // Start hold timer (300ms threshold)
    holdTimerRef.current = setTimeout(() => {
      onCellHoldStart(row, col);
    }, 300);
  }, [onCellHoldStart, row, col]);

  const handlePointerUp = useCallback((event) => {
    event.stopPropagation();

    // If timer still running, it was a quick click
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      onCellClick(row, col);
    } else {
      // It was a hold, end it
      onCellHoldEnd();
    }
  }, [onCellClick, onCellHoldEnd, row, col]);

  const handlePointerOver = useCallback((event) => {
    event.stopPropagation();
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback((event) => {
    event.stopPropagation();
    setHovered(false);

    // Cancel hold if pointer leaves
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  return (
    <mesh
      position={position}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      <meshStandardMaterial
        color={displayColor}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        roughness={0.35}
        metalness={0.18}
        opacity={opacity}
        transparent={shouldDim}
      />
    </mesh>
  );
}

// Helper function to render instrument shapes
function renderShape(shapeName, strokeColor = "#ffffff") {
  const svgProps = {
    className: "shape-svg",
    viewBox: "0 0 40 40",
    style: { "--shape-glow": strokeColor },
  };

  const strokeProps = {
    stroke: strokeColor,
    strokeWidth: 2.5,
    fill: "none",
    strokeLinejoin: "round",
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke",
  };

  switch (shapeName) {
    case "square":
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <rect x="6" y="6" width="28" height="28" {...strokeProps} />
          </svg>
        </div>
      );
    case "triangle":
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <polygon points="20 4 36 34 4 34" {...strokeProps} />
          </svg>
        </div>
      );
    case "circle":
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <circle cx="20" cy="20" r="14" {...strokeProps} />
          </svg>
        </div>
      );
    case "pentagon":
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <polygon points="20 4 36 16 30 34 10 34 4 16" {...strokeProps} />
          </svg>
        </div>
      );
    case "diamond":
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <polygon points="20 4 36 20 20 36 4 20" {...strokeProps} />
          </svg>
        </div>
      );
    default:
      return (
        <div className="shape-wrapper">
          <svg {...svgProps}>
            <rect x="6" y="6" width="28" height="28" {...strokeProps} />
          </svg>
        </div>
      );
  }
}

const PianoKey = memo(({
  note,
  index,
  isBlackKey,
  isActive,
  decorateC,
  nativeOverlay,
  isInKeyboardRange,
  currentInstrument,
  isKeyboardMapped,
  showKeyboardGuide,
  currentOctave,
  onPress,
}) => {
  const className = [
    "piano-key",
    isBlackKey ? "piano-key--black" : "piano-key--white",
    isActive ? "piano-key--active" : "",
    decorateC && !isBlackKey ? "piano-key--c-decor" : "",
    isKeyboardMapped && isInKeyboardRange && !isBlackKey ? "piano-key--keyboard-mapped-white" : "",
    isKeyboardMapped && isInKeyboardRange && isBlackKey ? "piano-key--keyboard-mapped-black" : "",
  ].filter(Boolean).join(" ");

  const handlePress = useCallback(() => {
    onPress(index);
  }, [onPress, index]);

  // Special styling for C and F white keys
  const isC = !isBlackKey && (note === "C");
  const wrapperStyle = isC ? { borderLeft: "2px orange" } : undefined;
  const isCorF = !isBlackKey && (note === "C" || note === "F");
  const wrapperStyleF = isCorF ? { marginLeft: ".05%" } : undefined;

  // Instrument-specific gradient colors for keyboard-mapped keys (only when Tab is active)
  const instrumentGradients = [
    { color1: 'pink', color2: 'red' },           // Square - pink/red
    { color1: 'violet', color2: '#33337b' },      // Triangle - violet/dark blue
    { color1: 'teal', color2: 'darkslateblue' },  // Circle - teal/darkslateblue
    { color1: 'lightgreen', color2: 'lime' },     // Pentagon - lightgreen/lime
    { color1: 'orange', color2: 'darkorange' }    // Diamond - orange/darkorange
  ];

  const gradient = instrumentGradients[currentInstrument];
  const keyStyle = isKeyboardMapped && isInKeyboardRange && !isBlackKey
    ? { background: `linear-gradient(to bottom, transparent, black), linear-gradient(${gradient.color1}, ${gradient.color2})` }
    : undefined;

  // Keyboard letter mapping for guide overlay
  const keyMap = {
    0: 'A', 1: 'W', 2: 'S', 3: 'E', 4: 'D', 5: 'F', 6: 'T', 7: 'G', 8: 'Y', 9: 'H', 10: 'U', 11: 'J',
    12: 'K', 13: 'O', 14: 'L', 15: 'P', 16: ';', 17: "'", 18: '['
  };

  // Calculate position within the keyboard-mapped range (1.5 octaves = 19 keys)
  const keyboardStartIndex = currentOctave * 12;
  const keyboardRangePosition = isInKeyboardRange ? (index - keyboardStartIndex) : null;
  const keyLetter = keyboardRangePosition !== null && keyMap[keyboardRangePosition] ? keyMap[keyboardRangePosition] : null;

  const keyLabelStyle = {
    color: 'white',
    fontSize: 'large',
    fontWeight: '600',
    paddingBottom: '10px',
    bottom: '20%',
    width: 'min-content',
    justifySelf: 'center',
    border: '.5px white solid',
    padding: '0',
    paddingLeft: '3px',
    paddingRight: '3px',
    borderRadius: '3px',
    background: 'salmon',
    color: 'black',
    textShadow: 'none',
    position: 'absolute'
  };

  const noteLabelStyle = {
    color: 'white',
    fontSize: 'large',
    fontWeight: '800',
    paddingBottom: '10px',
    bottom: '0',
    paddingTop: '4px'
  };

  return (
    <div
      className={`piano-key-wrapper ${isBlackKey ? "piano-key-wrapper--black" : ""}`}
      style={wrapperStyle}
    >
      <button className={className} onClick={handlePress} style={keyStyle}>
        {nativeOverlay && <div className="piano-key-overlay" aria-hidden="true" />}

        {showKeyboardGuide && keyLetter && (
          <div className="piano-note-label" style={keyLabelStyle}>
            {keyLetter}
          </div>
        )}

        {!isBlackKey && (
          <div className="piano-note-label" style={showKeyboardGuide ? noteLabelStyle : undefined}>
            {note}
          </div>
        )}
      </button>
    </div>
  );
}, (prev, next) => (
  prev.isActive === next.isActive &&
  prev.isBlackKey === next.isBlackKey &&
  prev.onPress === next.onPress &&
  prev.note === next.note &&
  prev.nativeOverlay === next.nativeOverlay &&
  prev.decorateC === next.decorateC &&
  prev.isInKeyboardRange === next.isInKeyboardRange &&
  prev.currentInstrument === next.currentInstrument &&
  prev.isKeyboardMapped === next.isKeyboardMapped &&
  prev.showKeyboardGuide === next.showKeyboardGuide &&
  prev.currentOctave === next.currentOctave
));
