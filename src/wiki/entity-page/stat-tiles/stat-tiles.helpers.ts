// Tile labels must fit on one line: long labels get a short form, the full one stays in the tooltip.
// Keys are lower case because labels of the game stats come with their own casing.
const SHORT_LABELS: Record<string, string> = {
  'build time': 'Build',
  'research time': 'Research',
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
  'movement speed': 'Move',
  'attack speed': 'Atk speed',
};
const VERSUS_PREFIX = /^bonus vs /i;

export const toShortLabel = (label: string) => SHORT_LABELS[label.toLowerCase()] ?? label.replace(VERSUS_PREFIX, 'vs ');

// `×2 225` would read as 2225: the equal sign separates the batch size from the batch cost.
export const toBatchPrefix = (count: number) => `×${count} = `;
