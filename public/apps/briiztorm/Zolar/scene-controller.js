// Scene Controller for Zolar - Handles AI commands to control the Three.js scene

class ZolarSceneController {
  constructor(scene, camera, controls, planets, composer) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.planets = planets || {};
    this.composer = composer;

    // Animation state
    this.isPaused = false;
    this.animationSpeed = 0.4;

    // Custom celestial bodies (for file representation)
    this.customBodies = new Map();

    // Initialize message listener
    this.setupMessageListener();

    // Send ready signal to parent
    this.sendReadySignal();
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Handle messages from Briiztorm AI
      const { type, payload } = event.data || {};

      if (!type) return;

      console.log('[Zolar received]', type, payload);

      // Route to appropriate handler
      switch (type) {
        case 'PING':
          this.handlePing();
          break;

        // Camera controls
        case 'FOLLOW_SUN':
          this.focusOnSun();
          break;
        case 'NAVIGATE_TO_PLANET':
          this.navigateToPlanet(payload.planet);
          break;
        case 'RESET_VIEW':
          this.resetCamera();
          break;
        case 'SET_CONTROL_MODE':
          this.setControlMode(payload.mode);
          break;
        case 'CAMERA_RELATIVE_MOVE':
          this.handleCameraMove(payload);
          break;

        // Animation controls
        case 'SET_SPEED':
          this.setAnimationSpeed(payload.speed);
          break;
        case 'TOGGLE_PAUSE':
          this.togglePause();
          break;
        case 'INCREASE_SPEED':
          this.adjustSpeed(1.5);
          break;
        case 'DECREASE_SPEED':
          this.adjustSpeed(0.67);
          break;

        // Visual controls
        case 'SET_BLOOM':
          this.setBloomIntensity(payload.bloom);
          break;
        case 'TOGGLE_ORBITS':
          this.toggleOrbits();
          break;
        case 'TOGGLE_MOONS':
          this.toggleMoons();
          break;
        case 'TOGGLE_PLANET_LABELS':
          this.togglePlanetLabels();
          break;
        case 'TOGGLE_MOON_LABELS':
          this.toggleMoonLabels();
          break;

        // Scene manipulation
        case 'CREATE_CELESTIAL_BODY':
          this.createCelestialBody(payload);
          break;
        case 'UPDATE_CELESTIAL_BODY':
          this.updateCelestialBody(payload);
          break;
        case 'REMOVE_CELESTIAL_BODY':
          this.removeCelestialBody(payload.name);
          break;

        // Special modes
        case 'START_EXPLORATION_MODE':
          this.startExplorationMode();
          break;
        case 'SHOW_SYSTEM_MAP':
          this.showSystemMap();
          break;
        case 'HIGHLIGHT_RECENT':
          this.highlightRecentFiles();
          break;
        case 'UPDATE_SOLAR_SYSTEM':
          this.updateFromFileSystem(payload.projects);
          break;
      }
    });
  }

  sendReadySignal() {
    // Tell parent we're ready to receive commands
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'ZOLAR_READY' }, '*');
    }
  }

  handlePing() {
    window.parent.postMessage({ type: 'PONG' }, '*');
    this.sendReadySignal();
  }

  // Camera control methods
  focusOnSun() {
    // Animate camera to focus on sun
    const targetPosition = new THREE.Vector3(20, 10, 20);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    this.animateCameraTo(targetPosition, targetLookAt);
  }

  navigateToPlanet(planetName) {
    const planet = this.findPlanet(planetName);
    if (!planet) {
      console.warn('Planet not found:', planetName);
      return;
    }

    // Position camera to look at planet
    const distance = 10;
    const position = planet.position.clone();
    position.x += distance;
    position.y += distance * 0.5;
    position.z += distance;

    this.animateCameraTo(position, planet.position);
  }

  resetCamera() {
    const defaultPosition = new THREE.Vector3(30, 20, 30);
    const defaultLookAt = new THREE.Vector3(0, 0, 0);

    this.animateCameraTo(defaultPosition, defaultLookAt);
  }

  setControlMode(mode) {
    if (mode === 'orbit') {
      this.controls.enabled = true;
      // Disable keyboard controls if they exist
    } else if (mode === 'keyboard') {
      // Enable keyboard controls
      // You might want to implement FirstPersonControls here
    }
  }

  handleCameraMove(data) {
    const { movement, rotation, isRotating } = data;

    if (movement) {
      // Calculate movement relative to camera orientation
      const forward = new THREE.Vector3();
      const strafe = new THREE.Vector3();

      this.camera.getWorldDirection(forward);
      strafe.crossVectors(forward, this.camera.up);

      if (movement.forward) {
        this.camera.position.addScaledVector(forward, movement.forward);
      }
      if (movement.strafe) {
        this.camera.position.addScaledVector(strafe, movement.strafe);
      }
      if (movement.up) {
        this.camera.position.y += movement.up;
      }
    }

    if (rotation && isRotating) {
      // Apply rotation
      this.controls.rotateSpeed = 0.3;
      // You might need to directly manipulate controls here
    }
  }

  // Animation control methods
  setAnimationSpeed(speed) {
    this.animationSpeed = Math.max(0, Math.min(10, speed));
    console.log('Animation speed set to:', this.animationSpeed);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    console.log('Animation', this.isPaused ? 'paused' : 'resumed');
  }

  adjustSpeed(multiplier) {
    this.setAnimationSpeed(this.animationSpeed * multiplier);
  }

  // Visual control methods
  setBloomIntensity(intensity) {
    if (this.composer && this.composer.passes) {
      const bloomPass = this.composer.passes.find(p => p.constructor.name === 'UnrealBloomPass');
      if (bloomPass) {
        bloomPass.strength = intensity;
      }
    }
  }

  toggleOrbits() {
    // Toggle orbit line visibility
    this.scene.traverse((child) => {
      if (child.name && child.name.includes('orbit')) {
        child.visible = !child.visible;
      }
    });
  }

  toggleMoons() {
    // Toggle moon visibility
    this.scene.traverse((child) => {
      if (child.name && child.name.includes('moon')) {
        child.visible = !child.visible;
      }
    });
  }

  togglePlanetLabels() {
    // Toggle planet label visibility
    // You might need to implement text sprites for this
    console.log('Toggle planet labels - TODO: implement text sprites');
  }

  // Scene manipulation methods
  createCelestialBody(params) {
    const { type, name, size = 5, distance = 50, color, texture } = params;

    // Create geometry based on type
    const geometry = new THREE.SphereGeometry(size, 32, 32);

    // Create material
    const material = new THREE.MeshPhongMaterial({
      color: color || this.getColorForType(type),
      emissive: type === 'star' ? 0xffff00 : 0x000000,
      emissiveIntensity: type === 'star' ? 0.5 : 0
    });

    // Create mesh
    const body = new THREE.Mesh(geometry, material);
    body.name = name;
    body.userData = { type, customBody: true };

    // Position it
    const angle = Math.random() * Math.PI * 2;
    body.position.x = Math.cos(angle) * distance;
    body.position.z = Math.sin(angle) * distance;
    body.position.y = (Math.random() - 0.5) * 10;

    // Add to scene and tracking
    this.scene.add(body);
    this.customBodies.set(name, body);

    console.log('Created celestial body:', name);
  }

  updateCelestialBody(params) {
    const { name, size, position, color } = params;
    const body = this.customBodies.get(name);

    if (!body) {
      console.warn('Body not found for update:', name);
      return;
    }

    if (size !== undefined) {
      body.scale.setScalar(size / body.geometry.parameters.radius);
    }

    if (position) {
      body.position.copy(position);
    }

    if (color) {
      body.material.color.set(color);
    }
  }

  removeCelestialBody(name) {
    const body = this.customBodies.get(name);

    if (body) {
      this.scene.remove(body);
      this.customBodies.delete(name);
      console.log('Removed celestial body:', name);
    }
  }

  // Special mode methods
  startExplorationMode() {
    // Enable exploration features
    console.log('Exploration mode activated');
    // Could add special visual effects, UI elements, etc.
  }

  showSystemMap() {
    // Show overview of all bodies
    // Could zoom out camera to show entire system
    const mapPosition = new THREE.Vector3(0, 100, 0);
    const mapLookAt = new THREE.Vector3(0, 0, 0);

    this.animateCameraTo(mapPosition, mapLookAt);
  }

  highlightRecentFiles() {
    // Add glow or particle effects to recent files
    console.log('Highlighting recent files');
    // Implementation would depend on how you track recent files
  }

  updateFromFileSystem(projects) {
    // Clear existing custom bodies
    this.customBodies.forEach(body => {
      this.scene.remove(body);
    });
    this.customBodies.clear();

    // Create new bodies from project data
    projects.forEach((project, index) => {
      this.createCelestialBody({
        type: 'planet',
        name: project.name,
        size: Math.log(project.fileCount || 1) * 2,
        distance: 20 + index * 15,
        color: this.getColorForProjectType(project.type)
      });
    });
  }

  // Helper methods
  findPlanet(name) {
    // First check custom bodies
    const customBody = this.customBodies.get(name);
    if (customBody) return customBody;

    // Then check default planets
    const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const normalizedName = name.toLowerCase();

    if (this.planets[normalizedName]) {
      return this.planets[normalizedName];
    }

    // Search scene by name
    let found = null;
    this.scene.traverse((child) => {
      if (child.name && child.name.toLowerCase() === normalizedName) {
        found = child;
      }
    });

    return found;
  }

  animateCameraTo(targetPosition, targetLookAt) {
    // Simple animation (you might want to use TWEEN.js for smoother animation)
    const steps = 60;
    const startPosition = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();

    let step = 0;
    const animate = () => {
      if (step++ >= steps) return;

      const t = step / steps;
      const eased = this.easeInOutCubic(t);

      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(startLookAt, targetLookAt, eased);
      this.controls.update();

      requestAnimationFrame(animate);
    };

    animate();
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getColorForType(type) {
    const colors = {
      star: 0xffff00,
      planet: 0x4444ff,
      moon: 0xaaaaaa,
      asteroid: 0x888888,
      comet: 0x00ffff
    };
    return colors[type] || 0xffffff;
  }

  getColorForProjectType(type) {
    const colors = {
      'web': 0x00aaff,
      'app': 0x00ff00,
      'game': 0xff00ff,
      'data': 0xffaa00,
      'docs': 0xffff00
    };
    return colors[type] || 0x4444ff;
  }

  // Get current animation speed (for external use)
  getAnimationSpeed() {
    return this.isPaused ? 0 : this.animationSpeed;
  }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.ZolarSceneController = ZolarSceneController;
}