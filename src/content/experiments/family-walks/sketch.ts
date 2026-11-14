// Family Walks: our street through 2025 and 2026 as a small isometric scene, drawn on one canvas.
// The drawing code lives in scene.js (plain JavaScript); this file hands it the stage.
import type { StartSketch } from '../../../lib/sketch';
import { startScene } from './scene.js';

const start: StartSketch = (stage) => startScene(stage);

export default start;
