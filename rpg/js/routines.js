/* ============================================================
   ROUTINES — where folk are, and what they're doing, at each
   hour of the day. Pure data and lookups (no THREE, no DOM), so
   the tests can run them in Node; main.js walks everyone there
   and plays the part.

   A plan is a list of [fromHour, place, act, line?] steps, read
   round the clock: the last step that has started is the one in
   force, and before the first step of the day the last one from
   the night before still holds. `place` names a spot main.js
   knows for that region (an outdoor spot, a door to go home by,
   or a room inside the Carpenter's house). `act` is what they do
   when they get there:
     stand · stroll (wander about it) · work (a tool, steady
     blows) · garden (bent over the beds, slower) · cook · sit ·
     read · eat · chat · sleep · home (indoors, out of sight)
   `line` is what they say if you come by while they're at it.
   ============================================================ */

/* the Carpenter, out at his own place. Up before the sun for the garden, at his trades all day, dinner
   in the evening and a book in the library after; and every third night he stays up in the workshop. */
const BUHKON_DAY = [
  [0, 'bed', 'sleep'],
  [5.4, 'well', 'work', 'Water first. The beds drink before I do.'],
  [6.0, 'garden', 'garden', 'Morning, little one. The beans won’t weed themselves. Grab a hoe, or grab a bun.'],
  [8.6, 'greenhouse', 'garden', 'The seedlings like the warm. So do I, if I’m honest.'],
  [9.6, 'hives', 'stand', 'Slow hands round the bees. Calm first, then quick — and here, mostly calm.'],
  [10.4, 'timber', 'work', 'Seasoned ash, this. Two winters in the stack. Hand me that wedge?'],
  [12.8, 'hearth', 'eat', 'Bread, cheese, the last of the apples. Sit if you want some.'],
  [13.6, 'orchard', 'garden', 'Pruning. Every cut is a promise to the tree about next year.'],
  [15.4, 'woodshed', 'work', 'The winter wood. You’re never sorry for an extra cord.'],
  [17.0, 'kitchen', 'cook', 'Stew tonight. Wash your hands, and if you’re near the garden, bring me an onion.'],
  [18.6, 'dining', 'eat', 'Sit, sit. Eat while it’s hot. Tell me what you got up to.'],
  [19.6, 'study', 'read', 'An old Eldi ledger. Half of it’s sums, the other half is my grandfather complaining.'],
  [22.2, 'bed', 'sleep'],
];
/* the late night: dinner as ever, then the lamp in the workshop burns till past one */
const LATE_LINE = 'One of those nights. The wood’s talking and I’m listening. Go on to bed, I’ll be a while.';
const BUHKON_LATE_EVENING = [...BUHKON_DAY.filter(s => s[0] < 19.6), [19.6, 'workshop', 'work', LATE_LINE]];
const BUHKON_LATE_MORNING = [[0, 'workshop', 'work', 'Can’t sleep, so I make. Hold the lamp a little higher?'], [1.4, 'bed', 'sleep'], ...BUHKON_DAY.slice(1)];

/* the folk of Beuhk. `post` is wherever they stand in the story (their stall, the forge…);
   `home` is their own front door; `hearth` the town fire on the square; `square` the fountain */
const TOWN = {
  hemla: [
    [0, 'home', 'home'],
    [7.0, 'square', 'stroll', 'Too early for haggling. Come back when I’ve had my tea.'],
    [8.0, 'post', 'stand'],
    [19.2, 'hearth', 'chat', 'The books are closed. Tomorrow I’ll rob you fairly.'],
    [21.4, 'home', 'home'],
  ],
  duro: [
    [0, 'home', 'home'],
    [6.0, 'post', 'work', 'The cauldron wants feeding before I do.'],
    [12.4, 'hearth', 'eat', 'A smith eats like his fire does. Often, and a lot.'],
    [13.2, 'post', 'work'],
    [18.2, 'hearth', 'chat', 'No more hammering today. My arms have opinions.'],
    [21.6, 'home', 'home'],
  ],
  venkin: [
    [0, 'home', 'home'],
    [7.2, 'scaffold', 'work', 'Hold that end. No — the other end.'],
    [12.0, 'post', 'stand'],
    [17.0, 'hearth', 'cook', 'Supper’s on. It’s a builder’s stew: whatever was left standing.'],
    [20.4, 'hearth', 'chat'],
    [22.0, 'home', 'home'],
  ],
  ruut: [
    [0, 'home', 'home'],
    [5.6, 'pen', 'stroll', 'Counting heads. One, two… that one’s a Kofi. One, two…'],
    [12.0, 'pen', 'sit', 'The herd rests at noon, so I rest at noon. Fair’s fair.'],
    [13.0, 'pen', 'stroll'],
    [19.6, 'hearth', 'chat', 'They’re all in. Even the brainless one.'],
    [21.0, 'home', 'home'],
  ],
  sefa: [
    [0, 'home', 'home'],
    [8.0, 'square', 'stroll', 'Fennek! FENNEK! …Oh, hi.'],
    [12.0, 'post', 'stand'],
    [15.0, 'square', 'stroll'],
    [19.0, 'home', 'home'],
  ],
  v1: [   // Ama the baker: up in the dark for the ovens
    [0, 'home', 'home'],
    [4.4, 'post', 'work', 'Shh, the dough’s rising. It’s shy.'],
    [11.0, 'square', 'stroll', 'Buns! Buns that are still nearly warm!'],
    [16.0, 'home', 'home'],
    [19.0, 'hearth', 'chat', 'My feet. Oh, my feet.'],
    [21.0, 'home', 'home'],
  ],
  v2: [   // Teodr the farmer
    [0, 'home', 'home'],
    [5.6, 'field', 'garden', 'Weeds don’t sleep, so neither do I.'],
    [12.0, 'hearth', 'eat', 'Lunch. Don’t tell the crops.'],
    [13.0, 'field', 'garden'],
    [18.0, 'hearth', 'chat', 'Rain tomorrow, I can feel it in my knee.'],
    [21.4, 'home', 'home'],
  ],
  v3: [   // Lirra the lamplighter: out at dusk, home after the lamps are lit, up again to put them out
    [0, 'home', 'home'],
    [5.2, 'lamps', 'work', 'Putting the night away, one lamp at a time.'],
    [6.4, 'home', 'home'],
    [10.6, 'square', 'stroll'],
    [14.0, 'post', 'stand'],
    [18.2, 'lamps', 'work', 'Dusk! My hour. Mind the ladder.'],
    [21.0, 'hearth', 'chat'],
    [23.0, 'home', 'home'],
  ],
  v4: [   // Bosk the dockhand
    [0, 'home', 'home'],
    [6.0, 'pier', 'work', 'Crates don’t carry themselves. I’ve asked.'],
    [12.2, 'hearth', 'eat'],
    [13.0, 'pier', 'work'],
    [17.4, 'hearth', 'chat', 'The Stryx was in a mood today. Hot seed, cold temper.'],
    [22.0, 'home', 'home'],
  ],
  kw1: [  // Orrin the builder
    [0, 'home', 'home'],
    [7.0, 'post', 'work', 'Mind the scaffold.'],
    [12.0, 'hearth', 'eat'],
    [12.8, 'post', 'work'],
    [17.2, 'hearth', 'chat', 'A wall a day. That’s the Keilia way. Some days half a wall.'],
    [20.6, 'home', 'home'],
  ],
};

/* the clock's day count changes at midnight; a night belongs to the evening it started on */
export function nightOf(hour, day) { return hour < 12 ? day - 1 : day; }
/* every third night the Carpenter works late */
export function lateNight(hour, day) { return ((nightOf(hour, day) % 3) + 3) % 3 === 2; }

/* the step of a plan in force at this hour */
export function stepAt(plan, hour) {
  const h = ((hour % 24) + 24) % 24;
  let cur = plan[plan.length - 1], i = plan.length - 1;
  for (let k = 0; k < plan.length; k++) if (plan[k][0] <= h) { cur = plan[k]; i = k; }
  return { from: cur[0], place: cur[1], act: cur[2], line: cur[3] || null, i };
}

/* what someone is doing now, or null if they keep to no routine there */
export function routineFor(id, region, hour, day) {
  if (region === 'property' && id === 'buhkon') {
    const late = lateNight(hour, day);
    const plan = !late ? BUHKON_DAY : hour < 12 ? BUHKON_LATE_MORNING : BUHKON_LATE_EVENING;
    return { ...stepAt(plan, hour), late };
  }
  if (region === 'xilia' && TOWN[id]) return { ...stepAt(TOWN[id], hour), late: false };
  return null;
}

/* the rooms of the Carpenter's house a plan can name (anything else is outdoors) */
export const INDOORS = { bed: 'buhkonBed', kitchen: 'kitchen', dining: 'dining', study: 'study', workshop: 'workshopBench' };
export const isIndoor = place => place === 'home' || !!INDOORS[place];

/* everyone who keeps a routine, by region (for the tests and the map) */
export const ROUTINE_FOLK = { property: ['buhkon'], xilia: Object.keys(TOWN) };
