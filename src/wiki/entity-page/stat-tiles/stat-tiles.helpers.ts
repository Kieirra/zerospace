// Tile labels must fit on one line: long labels get a short form, the full one stays in the tooltip.
// Keys are lower case because labels of the game stats come with their own casing.
const SHORT_LABELS: Record<string, string> = {
  'build time': 'Build',
  'research time': 'Research',
  'upgrade time': 'Time',
  'projectile speed': 'Missile',
  'energy cost': 'Energy',
  'burst cooldown': 'Burst CD',
  cooldown: 'CD',
  'armor rating': 'Armor',
  'armor type': 'Type',
  'bonus damage': 'Bonus',
  'health regen': 'HP regen',
  'energy regen': 'EN regen',
  'shield regen': 'SH regen',
  'stun resistance': 'Stun res',
  'detection range': 'Detect',
  'shield damage threshold': 'Thresh',
  'movement speed': 'Move',
  'attack speed': 'Atk speed',
  'splash radius': 'Splash',
  'minimum range': 'Min range',
  'transport slots': 'Slots',
  'transport units': 'Units',
  'transport accepts': 'Accepts',
  'max health': 'Max HP',
  'max energy': 'Max EN',
  'max shields': 'Max SH',
  'worker spawn time': 'Spawn',
  'rate when depleted': 'Depleted',
  'harvesters per node': 'Per node',
  'damage over time': 'DoT',
  // Hero ability stats
  'cast time': 'Cast',
  'launch delay': 'Launch',
  'impact delay': 'Impact',
  'arming delay': 'Arming',
  're-hit delay': 'Re-hit',
  'travel time': 'Travel',
  'min travel time': 'Min travel',
  'max travel time': 'Max travel',
  'tick interval': 'Tick',
  'building damage': 'vs Bldg',
  'building stun': 'Bldg stun',
  'explosion radius': 'Blast',
  'heal radius': 'Heal area',
  'hit radius': 'Hit area',
  'stick radius': 'Stick',
  'starting radius': 'Start radius',
  'cone angle': 'Cone',
  'leash range': 'Leash',
  'melee range': 'Melee rng',
  'melee damage': 'Melee dmg',
  'initial damage': 'Initial',
  'min swap distance': 'Min swap',
  'max captured supply': 'Max supply',
  'armor per enemy hit': 'Armor/hit',
  'armor duration': 'Armor time',
  'slow duration': 'Slow time',
  'pull duration': 'Pull time',
  'jump duration': 'Jump time',
  'buff duration': 'Buff time',
  'charge speed': 'Charge',
  'dash speed': 'Dash',
  'grapple speed': 'Grapple',
  'hammer speed': 'Hammer',
  'jump speed (transform)': 'Form jump',
  'movement speed (water form)': 'Water move',
  'turret health': 'Turret HP',
  'totem health': 'Totem HP',
  'mine health': 'Mine HP',
  'mine arming time': 'Arming',
  'mine attack slow': 'Mine atk slow',
};
const SHORT_PATTERNS: [RegExp, string][] = [
  // "Bonus vs Air", "Bonus Damage vs Medium" → "vs Air", "vs Medium"
  [/^bonus (?:damage )?vs /i, 'vs '],
  // "Hexite per 100 XP" → "Hexite/100XP"
  [/ per 100 xp$/i, '/100XP'],
  // Economy labels lose their resource word, shown by its icon: "Hexite / min (rich)" → "Rich"
  [/^(?:hexite|flux) \/ min \(rich\)$/i, 'Rich'],
  [/^(?:hexite|flux) \/ min per worker$/i, 'Per worker'],
  [/^(?:hexite|flux) \/ min$/i, 'Income'],
  [/^pit (?:hexite|flux) \(rich\)$/i, 'Rich pit'],
  [/^pit (?:hexite|flux)$/i, 'Pit'],
];

export const toShortLabel = (label: string) =>
  SHORT_LABELS[label.toLowerCase()] ??
  SHORT_PATTERNS.reduce((short, [pattern, replacement]) => short.replace(pattern, replacement), label);

// Smallest tile width that keeps the longest label of a set on one line: padding and icon,
// then about 0.5rem per character of the label font (Chakra Petch 10px, uppercase, tracked).
export const toTileMinWidth = (labels: string[], isNested = false) => {
  const longest = Math.max(0, ...labels.map((label) => toShortLabel(label).length));
  return `${Math.max(isNested ? MIN_NESTED_TILE_REM : MIN_TILE_REM, TILE_CHROME_REM + longest * LABEL_CHAR_REM)}rem`;
};

const MIN_TILE_REM = 6.5;
const MIN_NESTED_TILE_REM = 6;
const TILE_CHROME_REM = 2.5;
const LABEL_CHAR_REM = 0.5;

// `×2 225` would read as 2225: the equal sign separates the batch size from the batch cost.
export const toBatchPrefix = (count: number) => `×${count} = `;
