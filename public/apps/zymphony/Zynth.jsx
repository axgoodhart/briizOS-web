import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

const GRID_ROWS = 16;
const GRID_COLS = 16;
const INSTRUMENTS = 5;
const EFFECTS = ["REVERB", "INTONATION", "CUTOFF", "ATTACK", "DISTORTION"];
const EFFECT_LABELS = {
0: "REVERB",
1: "INTONATION",
2: "CUTOFF",
3: "ATTACK",
4: "DISTORTION"
};
const MODES = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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
"#F22B2B",    // Red
"#8347E0",    // Purple
"#0A9DC7",    // Cyan
"#1FB978",    // Green
"#FF8019"     // Orange
];

const INSTRUMENT_SHAPES = ["square", "triangle", "circle", "pentagon", "diamond"];

export default function Zynth() {
// State variables
const [isPlaying, setIsPlaying] = useState(false);
const [isRecording, setIsRecording] = useState(false);
const [currentStep, setCurrentStep] = useState(0);
const [currentInstrument, setCurrentInstrument] = useState(0);
const [gridGroup, setGridGroup] = useState(1);
const [currentMode, setCurrentMode] = useState("Phrygian");
const [currentEffectIndex, setCurrentEffectIndex] = useState(0);
const [instrumentModes, setInstrumentModes] = useState(Array(INSTRUMENTS).fill("Phrygian"));
const [activeKeys, setActiveKeys] = useState(Array(NOTES.length).fill(false));
const [bpm, setBpm] = useState(120);

// Grid state - array of arrays with note information
const [grid, setGrid] = useState(createEmptyGrid());

// Volume levels for each instrument (0-1)
const [volumes, setVolumes] = useState([0.6, 0.4, 0.8, 0.5, 0.7]);

// Effect levels for each instrument (0-1)
const [effects, setEffects] = useState([
{ reverb: 0.5, intonation: 0.5, cutoff: 0.5, attack: 0.5, distortion: 0.2 },
{ reverb: 0.3, intonation: 0.6, cutoff: 0.4, attack: 0.7, distortion: 0.3 },
{ reverb: 0.6, intonation: 0.7, cutoff: 0.8, attack: 0.3, distortion: 0.1 },
{ reverb: 0.4, intonation: 0.5, cutoff: 0.5, attack: 0.6, distortion: 0.4 },
{ reverb: 0.7, intonation: 0.4, cutoff: 0.7, attack: 0.5, distortion: 0.5 }
]);

// Audio objects refs
const synths = useRef([]);
const sequencer = useRef(null);

// Initialize audio components
useEffect(() => {
// Create synths for each instrument
synths.current = Array(INSTRUMENTS).fill().map((_, i) => {
let synth;

```
  // Create different synth types for different instruments
  switch(i) {
    case 0: // Square - Basic synth
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' }
      }).toDestination();
      break;
    case 1: // Triangle - FM synth
      synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.01,
        modulationIndex: 5
      }).toDestination();
      break;
    case 2: // Circle - AM synth
      synth = new Tone.PolySynth(Tone.AMSynth).toDestination();
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
  synth.volume.value = Tone.gainToDb(volumes[i]);
  
  // Add effects chain for all synths
  const reverb = new Tone.Reverb(3).toDestination();
  const filter = new Tone.Filter(2000, "lowpass").connect(reverb);
  const distortion = new Tone.Distortion(effects[i].distortion).connect(filter);
  
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
```

}, []);

// Update effect parameters when they change
useEffect(() => {
synths.current.forEach((synthObj, i) => {
if (synthObj && synthObj.synth) {
// Update volume
synthObj.synth.volume.value = Tone.gainToDb(volumes[i]);

```
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
```

}, [volumes, effects]);

// Set up sequencer when play state changes
useEffect(() => {
if (isPlaying) {
// Start audio context if it's not running
if (Tone.context.state !== 'running') {
Tone.start();
}

```
  // Set up sequencer
  const steps = GRID_COLS;
  const subdivision = "16n";
  
  // Clear any existing sequence
  if (sequencer.current) {
    sequencer.current.dispose();
  }
  
  // Set BPM
  Tone.Transport.bpm.value = bpm;
  
  // Create new sequence
  sequencer.current = new Tone.Sequence(
    (time, step) => {
      // Update UI
      setCurrentStep(step);
      
      // Reset active keys
      setActiveKeys(Array(NOTES.length).fill(false));
      const newActiveKeys = [...Array(NOTES.length).fill(false)];
      
      // Check and play notes for each instrument at this step
      for (let inst = 0; inst < INSTRUMENTS; inst++) {
        // Find all active notes for this instrument and step
        for (let row = 0; row < GRID_ROWS; row++) {
          if (grid[row][step]?.active && grid[row][step].instrument === inst) {
            // Calculate pitch (convert row to note)
            const noteIndex = GRID_ROWS - 1 - row; 
            const octave = Math.floor(noteIndex / 12) + 3;
            const note = NOTES[noteIndex % 12];
            const fullNote = `${note}${octave}`;
            
            // Mark key as active
            newActiveKeys[noteIndex % 12] = true;
            
            // Apply attack based on effect setting
            const attackTime = 0.01 + (effects[inst].attack * 0.5);
            
            // Play the note based on synth type
            if (inst < 3) { // Poly synths
              synths.current[inst].synth.triggerAttackRelease(fullNote, "16n", time);
            } else { // Mono synths
              synths.current[inst].synth.triggerAttackRelease(fullNote, "16n", time);
            }
          }
        }
      }
      
      // Update active keys state
      setActiveKeys(newActiveKeys);
    },
    Array.from({ length: steps }, (_, i) => i),
    subdivision
  );
  
  // Start sequence
  sequencer.current.start(0);
  Tone.Transport.start();
  
} else {
  // Stop sequence if it exists
  if (sequencer.current) {
    sequencer.current.stop();
  }
  Tone.Transport.stop();
  setCurrentStep(0);
}

// Cleanup
return () => {
  if (sequencer.current) {
    sequencer.current.dispose();
  }
};
```

}, [isPlaying, grid, bpm]);

// Helper to create empty grid
function createEmptyGrid() {
return Array(GRID_ROWS).fill().map(() =>
Array(GRID_COLS).fill().map(() => ({ active: false, instrument: null }))
);
}

// Handle grid cell click
function handleGridClick(row, col) {
const newGrid = […grid];

```
if (newGrid[row][col].active) {
  // If already active, deactivate it
  newGrid[row][col] = { active: false, instrument: null };
} else {
  // Activate for current instrument
  newGrid[row][col] = { active: true, instrument: currentInstrument };
  
  // Play the note when activating for immediate feedback
  const noteIndex = GRID_ROWS - 1 - row; 
  const octave = Math.floor(noteIndex / 12) + 3;
  const note = NOTES[noteIndex % 12];
  const fullNote = `${note}${octave}`;
  
  synths.current[currentInstrument].synth.triggerAttackRelease(fullNote, "16n");
}

setGrid(newGrid);
```

}

// Handle keyboard key click
function handleKeyClick(noteIndex) {
// Calculate the row index (reversed from note index)
const rowIndex = GRID_ROWS - 1 - (noteIndex % 12);

```
// Play the note
const octave = Math.floor(noteIndex / 12) + 3;
const note = NOTES[noteIndex % 12];
const fullNote = `${note}${octave}`;

// Show key as active momentarily
const newActiveKeys = [...activeKeys];
newActiveKeys[noteIndex % 12] = true;
setActiveKeys(newActiveKeys);

// Play the note - handle both poly and mono synths
const currentSynth = synths.current[currentInstrument].synth;
if (currentInstrument < 3) { // Poly synths
  currentSynth.triggerAttackRelease(fullNote, "8n");
} else { // Membrane and Metal synths are monophonic
  currentSynth.triggerAttackRelease(fullNote, "8n");
}

// Reset key active state after a short delay
setTimeout(() => {
  const resetKeys = [...activeKeys];
  resetKeys[noteIndex % 12] = false;
  setActiveKeys(resetKeys);
}, 200);

// If in recording mode and playing, add the note to the current step
if (isRecording && isPlaying) {
  const newGrid = [...grid];
  newGrid[rowIndex][currentStep] = { active: true, instrument: currentInstrument };
  setGrid(newGrid);
}
```

}

// Handle volume change
function handleVolumeChange(instrumentIndex, newValue) {
const newVolumes = […volumes];
newVolumes[instrumentIndex] = newValue;
setVolumes(newVolumes);
}

// Handle effect change
function handleEffectChange(instrumentIndex, effectName, newValue) {
const newEffects = […effects];
newEffects[instrumentIndex] = {
…newEffects[instrumentIndex],
[effectName.toLowerCase()]: newValue
};
setEffects(newEffects);
}

// Cycle through effects for an instrument
function cycleInstrumentEffect() {
setCurrentEffectIndex((prev) => (prev + 1) % EFFECTS.length);
}

// Render the app
return (
<div className="flex flex-col h-full w-full bg-black text-white font-sans overflow-hidden">
{/* Top control bar */}
<div className="bg-black p-3 flex items-center space-x-3 border-b border-gray-800">
<button
onClick={() => setIsPlaying(true)}
className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 shadow-lg border border-gray-800 transition-all duration-200"
disabled={isPlaying}
style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)" }}
>
<div className="w-0 h-0 ml-1 border-y-[10px] border-l-[16px] border-y-transparent border-l-green-400" />
</button>

```
    <button 
      onClick={() => setIsPlaying(false)}
      className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 shadow-lg border border-gray-800 transition-all duration-200"
      disabled={!isPlaying}
      style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)" }}
    >
      <div className="flex space-x-1">
        <div className="w-3 h-8 bg-red-400 rounded-sm"></div>
        <div className="w-3 h-8 bg-red-400 rounded-sm"></div>
      </div>
    </button>
    
    <button 
      onClick={() => setIsRecording(!isRecording)}
      className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg border border-gray-800 ${isRecording ? 'bg-gradient-to-br from-red-900 to-red-950 pulsate-red' : 'bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900'}`}
      style={{ boxShadow: isRecording ? "0 0 15px rgba(255, 0, 0, 0.5)" : "0 4px 10px rgba(0, 0, 0, 0.5)" }}
    >
      <div className={`w-6 h-6 rounded-full ${isRecording ? 'bg-red-500 shadow-red' : 'bg-red-400'}`} 
        style={{ boxShadow: isRecording ? "0 0 10px rgba(255, 0, 0, 0.7)" : "" }}></div>
    </button>
    
    {/* Timeline scrubber */}
    <div className="flex-grow h-3 bg-gray-900 rounded-full relative mx-2 shadow-inner border border-gray-800" 
      style={{ boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.5)" }}>
      <div 
        className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
        style={{ 
          width: `${(currentStep / (GRID_COLS - 1)) * 100}%`,
          transition: 'width 0.1s linear',
          boxShadow: "0 0 10px rgba(120, 120, 255, 0.5)"
        }}
      ></div>
    </div>
    
    <div className="flex items-center mr-1">
      <div className="text-xs text-gray-400 mr-2 font-semibold">BPM</div>
      <div className="relative w-16">
        <input 
          type="range" 
          min="60" 
          max="180" 
          step="1"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-gray-800"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)",
          }}
        />
        <div 
          className="absolute top-0 left-0 h-2 rounded-full pointer-events-none" 
          style={{
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
            width: `${((bpm - 60) / 120) * 100}%`,
            boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)"
          }}
        ></div>
      </div>
      <div className="text-xs text-blue-400 ml-2 font-mono w-8">{bpm}</div>
    </div>
    
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-gray-300 flex items-center justify-center text-black font-bold shadow-lg" 
      style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3), inset 0 -2px 3px rgba(0, 0, 0, 0.2)" }}>
      {gridGroup}
    </div>
  </div>
  
  {/* Main content area */}
  <div className="flex flex-1 overflow-hidden">
    {/* Left panel - volume and effects */}
    <div className="w-52 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 flex flex-col">
      <div className="px-4 py-3 text-gray-400 uppercase text-xs tracking-wider font-semibold">Volume</div>
      
      {/* Volume sliders */}
      {INSTRUMENT_SHAPES.map((shape, i) => (
        <div key={`vol-${i}`} className="px-4 py-2 flex items-center">
          <div className="w-9 h-9 mr-3 flex items-center justify-center rounded-md" 
            style={{ background: INSTRUMENT_COLORS[i], boxShadow: "0 3px 8px rgba(0, 0, 0, 0.3)" }}>
            {renderShape(shape, "rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.7)")}
          </div>
          
          <div className="relative flex-grow">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumes[i]}
              onChange={(e) => handleVolumeChange(i, parseFloat(e.target.value))}
              className="w-full h-2 appearance-none bg-gray-800 rounded-full outline-none"
              style={{
                background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
                boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)",
                cursor: 'pointer'
              }}
            />
            <div 
              className="absolute top-0 left-0 h-2 rounded-full pointer-events-none" 
              style={{
                background: INSTRUMENT_COLORS[i],
                width: `${volumes[i] * 100}%`,
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
              }}
            ></div>
          </div>
        </div>
      ))}
      
      <div className="flex justify-center my-4 space-x-2 px-4">
        {INSTRUMENT_SHAPES.map((shape, i) => (
          <button
            key={`instrument-${i}`}
            onClick={() => setCurrentInstrument(i)}
            className={`rounded-md transition-all duration-200 ${currentInstrument === i ? 'ring-2 ring-white scale-110' : 'opacity-70 scale-100'}`}
            style={{ 
              width: '40px', 
              height: '40px', 
              background: INSTRUMENT_COLORS[i],
              boxShadow: currentInstrument === i ? `0 0 15px ${INSTRUMENT_SOLID_COLORS[i]}` : "0 3px 8px rgba(0, 0, 0, 0.3)"
            }}
          >
            {renderShape(shape, "rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.7)")}
          </button>
        ))}
      </div>
      
      {/* Effect sliders */}
      <div className="mt-6 px-4">
        <div className="text-gray-400 uppercase text-xs tracking-wider font-semibold mb-3">Effects</div>
        {EFFECTS.map((effect, index) => {
          const effectColor = index === 0 || index === 1 ? 
            "linear-gradient(135deg, #FF4D4D, #F22B2B)" : 
            index === 2 ? 
            "linear-gradient(135deg, #0ECFFE, #0A9DC7)" : 
            index === 3 ? 
            "linear-gradient(135deg, #2CDD8E, #1FB978)" : 
            "linear-gradient(135deg, #FFA94D, #FF8019)";
          
          const effectSolidColor = index === 0 || index === 1 ? 
            "#F22B2B" : 
            index === 2 ? 
            "#0A9DC7" : 
            index === 3 ? 
            "#1FB978" : 
            "#FF8019";
          
          return (
            <div key={`effect-${index}`} className="py-2 relative">
              <div className="flex justify-between text-xs mb-2">
                <div 
                  className="p-1 w-9 h-9 flex items-center justify-center rounded-md" 
                  style={{ background: effectColor, boxShadow: "0 3px 8px rgba(0, 0, 0, 0.3)" }}
                  onClick={() => cycleInstrumentEffect()}
                >
                  {index < INSTRUMENT_SHAPES.length ? 
                    renderShape(INSTRUMENT_SHAPES[index], "rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.7)") :
                    <div className="w-4 h-4 rounded-full border-2 border-white"></div>
                  }
                </div>
                <span className={`uppercase font-semibold text-xs pt-2`} style={{ color: effectSolidColor }}>
                  {effect}
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effects[currentInstrument][effect.toLowerCase()]}
                  onChange={(e) => handleEffectChange(currentInstrument, effect.toLowerCase(), parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none"
                  style={{
                    background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
                    boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)",
                    cursor: 'pointer'
                  }}
                />
                <div 
                  className="absolute top-0 left-0 h-2 rounded-full pointer-events-none" 
                  style={{
                    background: effectColor,
                    width: `${effects[currentInstrument][effect.toLowerCase()] * 100}%`,
                    boxShadow: "0 0 8px rgba(255, 255, 255, 0.1)"
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Grid group info */}
      <div className="mt-auto p-6 bg-gradient-to-b from-transparent via-gray-900 to-black text-center">
        <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Grid Group</div>
        <div className="text-6xl font-light bg-gradient-to-b from-white to-gray-300 text-transparent bg-clip-text">{gridGroup}</div>
      </div>
    </div>
    
    {/* Middle area - grid sequencer */}
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 to-black">
      <div className="flex-1 p-4 overflow-auto relative">
        <div 
          className="grid gap-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
            height: "calc(100% - 8px)",
            width: "calc(100% - 8px)",
          }}
        >
          {grid.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <button
                key={`cell-${rowIndex}-${colIndex}`}
                className={`rounded-md transition-all duration-150 shadow-md hover:shadow-lg ${
                  currentStep === colIndex && isPlaying ? 'ring-1 ring-white' : ''
                }`}
                style={{
                  background: cell.active 
                    ? INSTRUMENT_COLORS[cell.instrument] 
                    : 'linear-gradient(145deg, #1c1c1c, #0f0f0f)',
                  boxShadow: cell.active 
                    ? `0 0 10px ${INSTRUMENT_SOLID_COLORS[cell.instrument]}80` 
                    : "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 2px 3px rgba(0, 0, 0, 0.3)",
                  transform: cell.active ? 'scale(1.05)' : 'scale(1)',
                  border: currentStep === colIndex && isPlaying
                    ? '1px solid rgba(255, 255, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                }}
                onClick={() => handleGridClick(rowIndex, colIndex)}
              />
            ))
          ))}
        </div>
        
        {/* Vertical position indicator */}
        {isPlaying && (
          <div 
            className="absolute top-4 bottom-4 w-[2px] bg-white opacity-30 pointer-events-none"
            style={{ 
              left: `calc(${(currentStep / (GRID_COLS - 1)) * 100}% + ${4 + currentStep * 2}px)`,
              transition: 'left 0.1s linear',
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
            }}
          ></div>
        )}
      </div>
      
      {/* Mode selection */}
      <div className="p-3 bg-gradient-to-r from-gray-900 to-black text-center border-t border-gray-800 flex items-center justify-between px-6">
        <button 
          className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-blue-950 hover:from-blue-800 hover:to-blue-900 flex items-center justify-center shadow-lg"
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="uppercase text-xs tracking-wider font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
          {currentMode} Mode
        </div>
        
        <button 
          className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-blue-950 hover:from-blue-800 hover:to-blue-900 flex items-center justify-center shadow-lg"
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  {/* Bottom keyboard */}
  <div className="h-48 bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 relative overflow-hidden">
    <div className="flex h-full relative">
      {NOTES.map((note, i) => {
        const isBlackKey = note.includes('#');
        const isActive = activeKeys[i];
        
        return (
          <div
            key={`key-${i}`}
            className={`relative ${isBlackKey ? 'z-10' : ''}`}
            style={{
              width: isBlackKey ? '8%' : '12%',
              height: isBlackKey ? '65%' : '100%',
              marginLeft: isBlackKey ? '-4%' : '',
              marginRight: isBlackKey ? '-4%' : '',
            }}
          >
            <button
              className={`absolute top-0 ${isBlackKey ? 'w-full' : 'w-[95%]'} h-full rounded-b-md transition-all duration-75 border-l border-r border-b border-gray-700`}
              style={{
                background: isBlackKey ? 
                  `linear-gradient(to bottom, ${isActive ? INSTRUMENT_COLORS[currentInstrument] : '#343a40'}, ${isActive ? 'rgba(0,0,0,0.7)' : '#212529'})` : 
                  `linear-gradient(to bottom, ${isActive ? INSTRUMENT_COLORS[currentInstrument] : '#4a5568'}, ${isActive ? 'rgba(0,0,0,0.6)' : '#2d3748'})`,
                boxShadow: isActive ? 
                  `0 0 20px ${INSTRUMENT_SOLID_COLORS[currentInstrument]}` : 
                  isBlackKey ? '0 0 5px rgba(0,0,0,0.3)' : '0 0 10px rgba(0,0,255,0.2)',
                transform: isActive ? 'translateY(3px)' : '',
              }}
              onClick={() => handleKeyClick(i)}
            >
              {!isBlackKey && (
                <div className="absolute bottom-3 left-0 right-0 text-center text-sm text-gray-400 font-light">
                  {note}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  </div>
  
  {/* Global styles */}
  <style jsx global>{`
    @keyframes pulsate-red {
      0% { box-shadow: 0 0 15px rgba(255, 0, 0, 0.5); }
      50% { box-shadow: 0 0 25px rgba(255, 0, 0, 0.8); }
      100% { box-shadow: 0 0 15px rgba(255, 0, 0, 0.5); }
    }
    .pulsate-red {
      animation: pulsate-red 2s infinite;
    }
  `}</style>
</div>
```

);
}

// Helper function to render instrument shapes
function renderShape(shapeName, bgColor = "transparent", borderColor = "transparent") {
const shapeStyle = {
width: '100%',
height: '100%',
backgroundColor: bgColor,
border: borderColor !== 'transparent' ? `2px solid ${borderColor}` : 'none'
};

switch(shapeName) {
case 'square':
return (
<div className="w-full h-full flex items-center justify-center">
<div className="w-3/4 h-3/4" style={{…shapeStyle, boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"}}></div>
</div>
);
case 'triangle':
return (
<div className="w-full h-full flex items-center justify-center">
<div style={{
width: 0,
height: 0,
borderLeft: '10px solid transparent',
borderRight: '10px solid transparent',
borderBottom: `16px solid ${borderColor}`,
filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))"
}}></div>
</div>
);
case 'circle':
return (
<div className="w-full h-full flex items-center justify-center">
<div className="w-3/4 h-3/4" style={{…shapeStyle, borderRadius: '50%', boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"}}></div>
</div>
);
case 'pentagon':
return (
<div className="w-full h-full flex items-center justify-center">
<svg viewBox="0 0 100 100" width="24" height="24">
<polygon
points="50,5 95,35 80,90 20,90 5,35"
fill={bgColor}
stroke={borderColor}
strokeWidth={borderColor !== 'transparent' ? 5 : 0}
style={{filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))"}}
/>
</svg>
</div>
);
case 'diamond':
return (
<div className="w-full h-full flex items-center justify-center">
<div style={{
width: '18px',
height: '18px',
backgroundColor: bgColor,
borderColor: borderColor,
borderWidth: borderColor !== 'transparent' ? '2px' : '0',
borderStyle: 'solid',
transform: 'rotate(45deg)',
boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
}}></div>
</div>
);
default:
return <div style={shapeStyle}></div>;
}
}