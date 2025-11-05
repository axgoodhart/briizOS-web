# NEXTSTEPS - Zynth Development Roadmap

## Feature 1: Per-Note Volume Control

### Overview
Individual volume control for each sequencer cell, allowing precise dynamic expression within patterns. Combines quick single-click assignment with an intuitive hold-and-build interaction for fine-grained control.

### Interaction Design

#### Single Click Behavior (Current)
- Click a cell → activates with current instrument volume setting
- Simple, fast workflow for standard sequencing

#### Click-and-Hold Behavior (New)
1. **User clicks and holds** a cell in the grid
2. **Visual feedback initiates:**
   - All cells **except** those in the same Z-row (depth layer) fade to **0.1 opacity**
   - The clicked cell remains at full opacity
3. **Volume builds over time:**
   - Cells in the same Z-row (behind the clicked cell) begin highlighting sequentially
   - Each highlight represents **one unit of volume** being added
   - Visual progression: front → back along the depth axis
   - Volume starts from **minimum** (very quiet) and builds upward
4. **User releases** when desired volume is reached
5. **All cells return** to normal opacity

### Technical Implementation

#### Data Model Changes
```javascript
// Current cell structure:
{ active: false, instrument: null }

// New cell structure:
{
  active: false,
  instrument: null,
  volume: 1.0  // Range: 0.0 - 1.0 (or 0 - 16 discrete steps)
}
```

#### Volume Quantization
- **16 volume steps** (matching PRISM_DEPTH = 16)
- Each depth layer represents one volume unit
- Step 1 (quietest) → Step 16 (loudest)
- Maps to: `volumeDb = Tone.gainToDb(step / 16)`

#### UI State Management
```javascript
const [holdingCell, setHoldingCell] = useState(null); // { row, col, startTime }
const [volumeBuildProgress, setVolumeBuildProgress] = useState(0); // 0-16
```

#### Interaction Timeline
1. **onPointerDown**: Start hold timer, record cell position, reset volume to step 1
2. **During hold** (interval ~150ms): Increment volume step, update visual indicators
3. **onPointerUp**: Finalize volume at current step

#### Visual Feedback Strategy

**Opacity Control:**
- Unrelated cells: `opacity: 0.1`
- Same Z-row cells: Progressive highlighting based on volume step
- Active (held) cell: Full opacity + distinct glow

**Depth Layer Visualization:**
```javascript
// For each depth layer (0-15):
if (volumeStep > depth) {
  // Highlight this depth layer
  emissiveIntensity = 0.6;
  color = instrumentColor;
} else {
  // Dim this depth layer
  emissiveIntensity = 0.1;
  color = baseDepthColor;
}
```

### User Experience Considerations

#### Timing
- **Hold threshold**: 300ms (distinguish from click)
- **Volume increment interval**: 100-150ms per step
- **Total build time**: ~1.6-2.4s for full volume (16 steps)

#### Visual Clarity
- Clear feedback showing which cells are affected
- Real-time audio preview during hold (optional)
- Smooth transitions to avoid jarring visual changes

#### Accessibility
- Tooltip showing current volume step during hold
- Alternative: Shift+Click to enter "volume edit mode"
- Keyboard shortcuts for volume adjustment (future)

### Edge Cases & Constraints

1. **What if cell is already active?**
   - Click-and-hold **overwrites** existing volume
   - Starts from step 1, rebuilds to new value

2. **What if user holds beyond max volume?**
   - Stop at step 16, visual indication of max reached
   - Optionally loop back to step 1 (circular behavior)

3. **Grid recording during hold?**
   - Disable recording while volume adjustment is active
   - Or: Record with real-time volume value

4. **Multiple cells selected?**
   - Phase 1: Single cell only
   - Phase 2: Multi-select with unified volume control

### Implementation Phases

**Phase 1: Core Functionality**
- [ ] Add volume field to cell data model
- [ ] Implement click-and-hold detection
- [ ] Add volume increment timer
- [ ] Basic visual feedback (opacity dimming)

**Phase 2: Visual Polish**
- [ ] Depth layer highlighting animation
- [ ] Smooth opacity transitions
- [ ] Active cell glow effect
- [ ] Volume indicator UI element

**Phase 3: Audio Integration**
- [ ] Pass per-note volume to Tone.js
- [ ] Real-time volume preview during hold
- [ ] Ensure volume blends with instrument volume

**Phase 4: UX Refinements**
- [ ] Tooltips showing volume step
- [ ] Visual guide for hold interaction (first-time users)
- [ ] Performance optimization for large patterns

### Success Metrics
- Users can set per-note dynamics in <3 seconds
- Visual feedback is clear and non-disruptive
- No performance degradation with complex patterns
- Interaction feels natural and discoverable

---

## Future Features (To Be Planned)
- Per-note pitch bend / vibrato
- Copy/paste patterns
- Pattern chaining / song mode
- MIDI export
- Preset management
- Undo/redo
- Multi-track recording
- Effects automation
- Sample import
- Collaborative editing
