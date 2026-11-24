// config.js — every tunable number for Neon Harbor lives here.
// Nothing in this file is copied from any other game: all values were
// picked fresh for this city, its cars and its missions.

export const WORLD = {
  w: 3600,
  h: 2500,
  roadPitch: 300,
  roadWidth: 96,
  waterY: 2380, // everything below this line is the harbor water
};

export const VIEW = { w: 1280, h: 720 };

// How fast the camera catches up to the player (per second, smoothed).
export const CAMERA = { followRate: 5 };

export const PLAYER = {
  walkSpeed: 175,
  runSpeed: 265,
  radius: 16,
  maxHealth: 100,
  punchRange: 58,
  punchDamage: 34,
  punchCooldown: 0.38,
  shootCooldown: 0.22,
  bulletSpeed: 820,
  arrestSeconds: 1.25,
  regenDelay: 6,
  regenRate: 5,
};

export const CAR = {
  accel: 420,
  brake: 620,
  reverseMax: 170,
  topSpeed: 540,
  drag: 0.55,
  steerRate: 2.6,
  radius: 26,
};

export const POLICE = {
  topSpeed: 500,
  accel: 380,
  ramDamage: 9,
  ramCooldown: 0.9,
  health: 100,
};

export const WANTED = {
  maxStars: 5,
  decayDelay: 10, // seconds after the last crime before stars start fading
  decayEvery: 8, // seconds per star once fading
  // how many cruisers are on the street for each star level
  cruisersForStars: [0, 1, 2, 3, 4, 5],
};

// Mission definitions: name, briefing, reward and the numbers each one needs.
export const MISSIONS = [
  {
    id: 1,
    name: 'Getaway Driver',
    briefing: 'Mara needs a driver. Get the sedan to the docks in 90 seconds.',
    reward: 500,
    timeLimit: 90,
  },
  {
    id: 2,
    name: 'Harbor Pickup',
    briefing: 'Grab the crate on Pier 2, then lose the heat and reach the safehouse.',
    reward: 800,
    timeLimit: 0,
  },
  {
    id: 3,
    name: 'Vault Heist',
    briefing: 'Hold E at the Harbor Bank vault to crack it, then escape at 4 stars.',
    reward: 2000,
    timeLimit: 0,
    crackSeconds: 3,
  },
];

export const COLORS = {
  grass: '#2e6b34',
  parkGrass: '#3a7d40',
  sidewalk: '#8d8d94',
  road: '#33333a',
  roadEdge: '#55555e',
  lane: '#d8d23a',
  buildingRoof: '#5d5a73',
  buildingRoof2: '#715f4e',
  buildingRoof3: '#4e6b6b',
  water: '#1d4e6b',
  waterDeep: '#173f57',
  dockConcrete: '#6f6f78',
  pier: '#7a5c3e',
  containerRed: '#a03d2d',
  containerBlue: '#2d5a8a',
  containerGreen: '#3d7a44',
  player: '#e8b13c',
  playerJacket: '#2b6cb0',
  pedShirt: ['#c0564f', '#4f7ec0', '#6a9a4f', '#b07fc0', '#c0a04f', '#4fb0a0'],
  cruiser: '#e8e8ec',
  cruiserStripe: '#1d4ed8',
  carColors: ['#b03a3a', '#3a6ab0', '#c0c0c8', '#3a8a4a', '#b07a2a', '#6a4a8a', '#2a2a2e', '#c05a7a'],
  cash: '#37d67a',
  health: '#ff5a6e',
  marker: '#ffd23a',
  safehouse: '#37d67a',
};

export const SAVE_KEY = 'neon-harbor-save-v1';

// Text shown on the title screen. All names are original to this game.
export const STORY = {
  title: 'NEON HARBOR',
  tagline: 'An original open-world crime story in the city of Port Meridian.',
  hero: 'You are Jax Reed, a driver-for-hire who just took one job too many.',
  contact: 'Your fixer is Mara Voss. She pays in cash and never asks twice.',
};
