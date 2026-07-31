export const BACKGROUNDS = {
  prepared: {
    id: 'prepared',
    name: 'PREPARED',
    subtitle: 'Resourceful + Cautious',
    description: 'You notice useful details and spend less energy while searching.',
    accent: 'MAP'
  },
  resilient: {
    id: 'resilient',
    name: 'RESILIENT',
    subtitle: 'Tough + Medic',
    description: 'Physical losses are softened and recovery actions restore more.',
    accent: 'HEART'
  },
  persuasive: {
    id: 'persuasive',
    name: 'PERSUASIVE',
    subtitle: 'Silver Tongue + Scrapper',
    description: 'People open up faster and tense encounters are easier to defuse.',
    accent: 'VOICE'
  }
};

export const PRELUDE_CHOICES = {
  phone: {
    id: 'phone',
    label: 'CHECK THE PHONE',
    text: 'The phone is dead, but the lock screen burns one last ghost image into the glass: 3:47 AM.',
    clue: 'clock-347',
    stat: { morale: -2 }
  },
  window: {
    id: 'window',
    label: 'LOOK OUTSIDE',
    text: 'The avenue below is frozen. Cars sit at impossible angles. Every window is black.',
    stat: { morale: -4 }
  },
  rise: {
    id: 'rise',
    label: 'GET OUT OF BED',
    text: 'Your feet hit cold floorboards. Whatever happened, waiting will not bring the power back.',
    stat: { energy: 2 }
  }
};

const A = (id, label, options = {}) => ({ id, label, ...options });

export const SCENES = {
  bedroom: {
    id: 'bedroom',
    title: 'BEDROOM',
    kicker: '6TH FLOOR APARTMENT',
    art: '▥',
    caption: 'Silence where the city should be.',
    description: 'The ceiling fan is motionless. Your phone is dead. Somewhere outside, glass breaks and nobody shouts afterward.',
    objective: 'Gather information and basic supplies.',
    actions: [
      A('inspect_phone', 'INSPECT DEAD PHONE', {
        hint: 'A frozen timestamp may matter.',
        time: 3,
        effects: { morale: -1 },
        clue: 'clock-347',
        once: true,
        outcome: 'The screen will not wake, but a pale afterimage remains: 3:47. The same minute the world stopped.'
      }),
      A('search_nightstand', 'SEARCH NIGHTSTAND', {
        risk: 'LOW', time: 6, effects: { hunger: -1, energy: -1 },
        addItems: ['Granola Bar'], once: true, score: 10,
        outcome: 'Under receipts and a dried-out pen, you find half a granola bar still sealed in its wrapper. Breakfast has lowered its standards.'
      }),
      A('go_kitchen', 'GO TO KITCHEN', { next: 'kitchen', time: 4, outcome: 'You move toward the kitchen, guided by memory more than light.' }),
      A('go_living', 'GO TO LIVING ROOM', { next: 'living_room', time: 4, outcome: 'The living room waits in the dark, the television reflecting your outline.' })
    ]
  },

  kitchen: {
    id: 'kitchen',
    title: 'KITCHEN',
    kicker: 'APARTMENT INTERIOR',
    art: '▤',
    caption: 'Cold appliances. Warm tap water. For now.',
    description: 'The refrigerator is already sweating. Cabinets hang open like mouths. The microwave display is blank, except for a faint violet pixel.',
    objective: 'Secure water, tools, and a route.',
    actions: [
      A('take_water', 'PACK WATER BOTTLES', {
        risk: 'LOW', time: 5, effects: { energy: -1 }, addItems: ['Water Bottle'], once: true, score: 15,
        outcome: 'Two bottles go into your bag. They feel heavier now that the taps have become a countdown.'
      }),
      A('search_drawer', 'SEARCH JUNK DRAWER', {
        risk: 'LOW', time: 8, effects: { hunger: -1, energy: -2 }, addItems: ['Paper Map', 'Swiss Army Knife'], once: true, score: 25,
        outcome: 'You recover a paper city map and a boxed Swiss Army knife beneath expired coupons. Civilization leaves useful debris.'
      }),
      A('use_microwave', 'PRESS MICROWAVE KEYPAD', {
        risk: 'UNKNOWN', hint: 'The violet pixel is not normal.', time: 4, effects: { morale: -3 }, clue: 'frequency-347', once: true, score: 20,
        outcome: 'The dead display flashes 34.7 for one second. The microwave has no power. It should not know any numbers.'
      }),
      A('go_hallway', 'LEAVE APARTMENT', {
        next: 'hallway', time: 5, effects: { morale: -2 }, outcome: 'You lock the apartment out of habit, then realize habit may be the last functioning system in the city.'
      }),
      A('return_bedroom', 'RETURN TO BEDROOM', { next: 'bedroom', time: 3, outcome: 'You return to the bedroom.' })
    ]
  },

  living_room: {
    id: 'living_room',
    title: 'LIVING ROOM',
    kicker: 'APARTMENT INTERIOR',
    art: '▣',
    caption: 'A black screen reflects someone unprepared.',
    description: 'The television is a dead mirror. Mail and emergency pamphlets cover the coffee table. The hallway door stands ten feet away.',
    objective: 'Learn what happened or move.',
    actions: [
      A('inspect_tv', 'INSPECT TELEVISION', {
        time: 4, effects: { morale: -1 }, once: true,
        outcome: 'For half a second, a purple scanline crawls upward through the dead screen. Then your reflection returns.'
      }),
      A('read_mail', 'READ EMERGENCY MAILER', {
        time: 6, effects: { morale: 2 }, addItems: ['Building Evacuation Card'], once: true, score: 15,
        outcome: 'A city emergency card lists a service entrance near the community shelter. You mocked the mailer when it arrived. The mailer declines to comment.'
      }),
      A('go_kitchen', 'GO TO KITCHEN', { next: 'kitchen', time: 3, outcome: 'You cross into the kitchen.' }),
      A('go_hallway', 'ENTER HALLWAY', { next: 'hallway', time: 4, effects: { morale: -2 }, outcome: 'You open the door. The building smells like dust, fear, and overheated wiring.' })
    ]
  },

  hallway: {
    id: 'hallway',
    title: 'SIXTH-FLOOR HALLWAY',
    kicker: 'NO ELEVATORS · NO LIGHTS',
    art: '╫',
    caption: 'Every closed door contains a decision.',
    description: 'Emergency lights are dead. Mrs. Chen is calling softly from 6B. The men in 6D are arguing over a useless battery pack. The stairwell door is propped open.',
    objective: 'Choose what kind of survivor you will be.',
    actions: [
      A('help_chen', 'HELP MRS. CHEN', {
        risk: 'MEDIUM', time: 18, effects: { morale: 8, energy: -4, thirst: -2 }, next: 'chen_apartment', setFlags: ['chen-helped'], score: 30,
        outcome: 'You force her jammed door and steady her into the hallway. She studies you, decides something, and tells you to follow.'
      }),
      A('visit_6d', 'QUESTION THE MEN IN 6D', {
        risk: 'MEDIUM', time: 10, effects: { morale: -2, energy: -2 }, addItems: ['Basement Key'], once: true, score: 15,
        outcome: 'The men trade you the superintendent’s basement key for the evacuation card’s shelter directions. Nobody admits who stole what.'
      }),
      A('search_closet', 'SEARCH HALL CLOSET', {
        risk: 'LOW', time: 8, effects: { energy: -2 }, addItems: ['Hand-Crank Flashlight'], once: true, score: 15,
        outcome: 'Behind a bucket and six identical paint cans, you find a hand-crank flashlight. Ten seconds of work buys a cone of greenish light.'
      }),
      A('take_stairs', 'TAKE THE STAIRWELL', { next: 'stairwell', time: 4, effects: { morale: -1 }, outcome: 'You start down six flights through a building full of listening people.' })
    ]
  },

  chen_apartment: {
    id: 'chen_apartment',
    title: 'MRS. CHEN’S APARTMENT',
    kicker: 'UNIT 6B',
    art: '◉',
    caption: 'A radio should not know your name.',
    description: 'Mrs. Chen winds a hand-crank radio. Static fills the room. On the table lies a notebook filled with frequencies and the same time written over and over: 3:47.',
    objective: 'Listen carefully.',
    actions: [
      A('accept_radio', 'ACCEPT THE RADIO', {
        time: 3, effects: { morale: 4 }, addItems: ['Hand-Crank Radio'], once: true, score: 25,
        outcome: 'She presses the radio into your hands. “It started before the lights died,” she says. “Now it waits for someone to answer.”'
      }),
      A('tune_347', 'TUNE TO 34.7', {
        risk: 'UNKNOWN', requiresClues: ['clock-347', 'frequency-347'], requiresItems: ['Hand-Crank Radio'], time: 7,
        effects: { morale: -6 }, clue: 'voice-override', setFlags: ['signal-tuned'], once: true, score: 40,
        outcome: 'Beneath the static, a voice speaks your name backward. Then, clearly: “SIGNAL OVERRIDE. FOLLOW THE ROUTE THAT ISN’T THERE.”'
      }),
      A('ask_chen', 'ASK WHAT SHE HEARD', {
        time: 6, effects: { morale: 2 }, once: true,
        outcome: 'Mrs. Chen heard three pulses, then four, then seven. She stopped calling it interference after the radio described her kitchen.'
      }),
      A('leave_for_stairs', 'LEAVE FOR STAIRWELL', { next: 'stairwell', time: 4, outcome: 'Mrs. Chen locks her door behind you. The radio continues whispering without power.' })
    ]
  },

  stairwell: {
    id: 'stairwell',
    title: 'STAIRWELL',
    kicker: 'SIX FLOORS DOWN',
    art: '≋',
    caption: 'Concrete amplifies every mistake.',
    description: 'Voices rise from below. Someone is crying on the third floor. The basement door is marked SUPERINTENDENT ONLY.',
    objective: 'Reach the street or risk the basement.',
    actions: [
      A('search_basement', 'UNLOCK BASEMENT', {
        requiresItems: ['Basement Key'], risk: 'MEDIUM', time: 14, effects: { energy: -6, thirst: -3 }, addItems: ['Folding Bicycle'], once: true, score: 35,
        outcome: 'The key opens a maintenance cage. Inside is a folding bicycle with flat but usable tires. The commute just became less impossible.'
      }),
      A('help_third_floor', 'HELP THE CRYING NEIGHBOR', {
        risk: 'MEDIUM', time: 15, effects: { energy: -4, thirst: -2, morale: 6 }, addItems: ['First Aid Kit'], once: true, score: 25,
        outcome: 'You help a father splint his daughter’s wrist. He gives you a first-aid kit because gratitude is still legal tender.'
      }),
      A('reach_street', 'DESCEND TO STREET', { next: 'street', time: 12, effects: { energy: -5, thirst: -2 }, score: 20, outcome: 'You push through the lobby doors. The city has become a crowd without instructions.' })
    ]
  },

  street: {
    id: 'street',
    title: 'STREET LEVEL',
    kicker: '15.0 MILES FROM HOME',
    art: '▦',
    caption: 'The city is awake and nothing works.',
    description: 'Traffic is frozen. People move in small, suspicious groups. Three routes could take you home: the bridge, the park and rail corridor, or the community shelter’s service network.',
    objective: 'Choose a route home.',
    actions: [
      A('direct_route', 'DIRECT ROUTE · BRIDGE', {
        risk: 'HIGH', hint: 'Fastest. Crowded. Violent.', next: 'bridge', time: 45, miles: -4.2,
        effects: { energy: -10, thirst: -8, hunger: -5, morale: -3 }, setFlags: ['route-direct'], outcome: 'You join the river of people heading for the bridge. Everyone believes speed is safety.'
      }),
      A('resource_route', 'RESOURCE ROUTE · STORE/PARK', {
        risk: 'MEDIUM', hint: 'Longer. Better supplies.', next: 'store', time: 28, miles: -2.0,
        effects: { energy: -6, thirst: -5, hunger: -3 }, setFlags: ['route-resource'], outcome: 'You cut toward the corner store and the park beyond it, trading distance for the chance to resupply.'
      }),
      A('social_route', 'SOCIAL ROUTE · SHELTER', {
        risk: 'MEDIUM', hint: 'Allies and hidden infrastructure.', next: 'shelter', time: 35, miles: -2.5,
        effects: { energy: -7, thirst: -5, hunger: -3, morale: 2 }, setFlags: ['route-social'], outcome: 'You follow the evacuation card toward the community shelter, where organized people may still exist.'
      }),
      A('inspect_map_signal', 'COMPARE MAP TO RADIO', {
        requiresItems: ['Paper Map', 'Hand-Crank Radio'], requiresFlags: ['signal-tuned'], risk: 'UNKNOWN', time: 8,
        clue: 'impossible-route', setFlags: ['signal-route-visible'], once: true, score: 40,
        outcome: 'The radio’s pulses align with a maintenance line omitted from the printed map. A route appears only when the paper is held beside the speaker.'
      })
    ]
  },

  store: {
    id: 'store',
    title: 'CORNER STORE',
    kicker: 'RESOURCE ROUTE',
    art: '▧',
    caption: 'Scarcity turns shelves into battlefields.',
    description: 'The front glass is broken. A wounded owner guards the back room while three strangers argue over the last cases of water.',
    objective: 'Get supplies without becoming the threat.',
    actions: [
      A('trade_owner', 'HELP OWNER · TRADE', {
        social: true, risk: 'MEDIUM', time: 20, effects: { morale: 5, energy: -3 }, addItems: ['Food Pack'], score: 25,
        outcome: 'You bandage the owner and receive a food pack. The strangers watch, then decide cooperation is temporarily fashionable.'
      }),
      A('grab_supplies', 'GRAB SUPPLIES', {
        risk: 'HIGH', time: 10, effects: { morale: -8, energy: -5 }, addItems: ['Food Pack', 'Water Bottle'], score: 10,
        outcome: 'You seize what you can and leave before the argument becomes a beating. The supplies feel heavier than they should.'
      }),
      A('continue_park', 'CONTINUE TO PARK', { next: 'park', time: 35, miles: -2.4, effects: { energy: -8, thirst: -6, hunger: -4 }, outcome: 'You take side streets toward the park, avoiding the loudest crowds.' })
    ]
  },

  park: {
    id: 'park',
    title: 'CITY PARK',
    kicker: 'RESOURCE ROUTE',
    art: '♜',
    caption: 'Open ground. Long shadows. No police sirens.',
    description: 'Families camp beneath trees. A maintenance gate leads toward the rail corridor. The radio clicks in a three-four-seven rhythm.',
    objective: 'Enter the rail corridor or follow the signal.',
    actions: [
      A('share_supplies', 'SHARE SUPPLIES', {
        requiresItems: ['Food Pack'], social: true, time: 15, effects: { morale: 10, hunger: -2 }, removeItems: ['Food Pack'], addItems: ['Rail Gate Key'], score: 35,
        outcome: 'A family trades you a rail gate key for food. Their youngest child salutes you with a plastic spoon.'
      }),
      A('force_gate', 'FORCE RAIL GATE', {
        risk: 'HIGH', time: 12, effects: { energy: -10, morale: -2 }, requiresAnyItems: ['Swiss Army Knife', 'Folding Bicycle'], setFlags: ['rail-open'], outcome: 'Metal screams as the gate gives way. Every head in the park turns toward the sound.'
      }),
      A('enter_rail', 'ENTER RAIL CORRIDOR', {
        requiresAnyItems: ['Rail Gate Key', 'Swiss Army Knife', 'Folding Bicycle'], next: 'rail', time: 30, miles: -3.0,
        effects: { energy: -7, thirst: -5, hunger: -3 }, outcome: 'You descend beside dead tracks, following the corridor away from the city center.'
      }),
      A('follow_signal_park', 'FOLLOW IMPOSSIBLE SIGNAL', {
        requiresFlags: ['signal-route-visible'], special: 'static', risk: 'UNKNOWN', time: 1,
        outcome: 'The radio emits a clean tone. A maintenance door that was not there a moment ago stands open.'
      })
    ]
  },

  shelter: {
    id: 'shelter',
    title: 'COMMUNITY SHELTER',
    kicker: 'SOCIAL ROUTE',
    art: '⌂',
    caption: 'Organization survives until trust runs out.',
    description: 'Volunteers ration water and collect names on paper. A former transit engineer claims the service tunnel still reaches the outskirts.',
    objective: 'Earn access to the tunnel.',
    actions: [
      A('help_shelter', 'WORK A SUPPLY SHIFT', {
        social: true, time: 35, effects: { energy: -7, thirst: 8, hunger: 6, morale: 8 }, addItems: ['Service Tunnel Pass'], score: 35,
        outcome: 'You organize a chaotic supply line. In return, the engineer gives you a tunnel pass and directions written on cardboard.'
      }),
      A('persuade_engineer', 'PERSUADE THE ENGINEER', {
        social: true, risk: 'MEDIUM', time: 15, effects: { morale: 3 }, addItems: ['Service Tunnel Pass'], score: 25,
        outcome: 'You convince the engineer that one more person in the tunnel is safer than one more desperate person outside.'
      }),
      A('leave_tunnel', 'ENTER SERVICE TUNNEL', {
        requiresItems: ['Service Tunnel Pass'], next: 'tunnel', time: 25, miles: -3.2,
        effects: { energy: -6, thirst: -4, hunger: -3 }, outcome: 'The steel door closes behind you. The tunnel smells of wet concrete and old electricity.'
      }),
      A('follow_signal_shelter', 'FOLLOW RADIO BELOW', {
        requiresFlags: ['signal-route-visible'], special: 'static', risk: 'UNKNOWN', time: 1,
        outcome: 'The radio points toward an unmarked stairwell. The engineer swears it was not there yesterday.'
      })
    ]
  },

  bridge: {
    id: 'bridge',
    title: 'RIVER BRIDGE',
    kicker: 'DIRECT ROUTE',
    art: '╬',
    caption: 'Thousands of people. One narrow crossing.',
    description: 'A stalled bus blocks two lanes. A group is charging “tolls” in bottled water. The pedestrian rail hangs over black river water.',
    objective: 'Cross without losing what keeps you alive.',
    actions: [
      A('negotiate_toll', 'NEGOTIATE PASSAGE', {
        social: true, risk: 'HIGH', time: 18, effects: { morale: -2, thirst: -4 }, score: 25,
        outcome: 'You turn the crowd against the self-appointed toll collectors by asking who elected them. Their authority lasts twelve seconds.'
      }),
      A('climb_bus', 'CLIMB OVER BUS', {
        risk: 'HIGH', time: 14, effects: { energy: -12, thirst: -4, morale: 2 }, score: 20,
        outcome: 'You climb across the bus roof while fists and accusations erupt below. The view is terrible and useful.'
      }),
      A('bike_sidepath', 'USE BICYCLE SIDEPATH', {
        requiresItems: ['Folding Bicycle'], risk: 'MEDIUM', time: 10, effects: { energy: -4, thirst: -3 }, score: 30,
        outcome: 'The folding bicycle slips through the maintenance sidepath. For once, an object works exactly as advertised.'
      }),
      A('reach_highway', 'REACH HIGHWAY', { next: 'highway', time: 45, miles: -5.1, effects: { energy: -10, thirst: -8, hunger: -6 }, outcome: 'The bridge recedes behind you. The highway points toward home in a line of dead vehicles.' }),
      A('follow_signal_bridge', 'FOLLOW SIGNAL UNDER BRIDGE', {
        requiresFlags: ['signal-route-visible'], special: 'static', risk: 'UNKNOWN', time: 1,
        outcome: 'The radio’s tone becomes a pressure behind your eyes. A maintenance hatch unlocks itself.'
      })
    ]
  },

  rail: {
    id: 'rail',
    title: 'RAIL CORRIDOR',
    kicker: 'RESOURCE ROUTE',
    art: '═',
    caption: 'Dead tracks still know where they go.',
    description: 'The corridor runs straight toward the outer districts. A maintenance cart sits on the rails. Storm clouds erase the skyline behind you.',
    objective: 'Push through to the outskirts.',
    actions: [
      A('use_cart', 'PUSH MAINTENANCE CART', {
        risk: 'MEDIUM', time: 40, miles: -4.5, effects: { energy: -9, thirst: -7, hunger: -5 }, score: 25,
        outcome: 'The cart rolls reluctantly, then gathers speed. You ride the last mile laughing harder than the situation deserves.'
      }),
      A('walk_tracks', 'WALK THE TRACKS', {
        risk: 'LOW', time: 65, miles: -4.5, effects: { energy: -13, thirst: -9, hunger: -7 }, outcome: 'You walk until the city becomes a dark shape behind you.'
      }),
      A('reach_outskirts_rail', 'CLIMB TO OUTSKIRTS', { next: 'suburbs', time: 35, miles: -3.0, effects: { energy: -7, thirst: -5, hunger: -4 }, outcome: 'You climb from the corridor into quiet residential streets. Home is close enough to hurt.' })
    ]
  },

  tunnel: {
    id: 'tunnel',
    title: 'SERVICE TUNNEL',
    kicker: 'SOCIAL ROUTE',
    art: '◫',
    caption: 'The old city beneath the new one.',
    description: 'Painted arrows mark utility sectors. Volunteers have left chalk notes for those behind them. A sealed gate blocks the final section.',
    objective: 'Open the final gate and surface.',
    actions: [
      A('use_pass_gate', 'USE TUNNEL PASS', {
        requiresItems: ['Service Tunnel Pass'], time: 8, effects: { morale: 3 }, setFlags: ['tunnel-gate-open'], score: 20,
        outcome: 'The mechanical lock accepts the stamped pass. Paper bureaucracy survives the apocalypse and, briefly, saves your life.'
      }),
      A('repair_gate', 'REPAIR MANUAL RELEASE', {
        requiresAnyItems: ['Swiss Army Knife', 'Hand-Crank Flashlight'], risk: 'MEDIUM', time: 18, effects: { energy: -5 }, setFlags: ['tunnel-gate-open'], score: 25,
        outcome: 'You expose the release cable and work it free. The gate rises with a noise like a building waking up.'
      }),
      A('surface_tunnel', 'SURFACE NEAR HOME', {
        requiresFlags: ['tunnel-gate-open'], next: 'suburbs', time: 55, miles: -6.0, effects: { energy: -11, thirst: -8, hunger: -6 },
        outcome: 'The tunnel slopes upward. Fresh air reaches you before daylight does.'
      })
    ]
  },

  highway: {
    id: 'highway',
    title: 'HIGHWAY OUTSKIRTS',
    kicker: '5.7 MILES FROM HOME',
    art: '⇥',
    caption: 'A road built for machines belongs to feet now.',
    description: 'Cars form an endless metal canyon. The suburbs begin beyond the next rise. Your legs have become negotiations.',
    objective: 'Make the final push.',
    actions: [
      A('rest_highway', 'REST BEHIND A TRUCK', {
        time: 30, effects: { energy: 16, morale: 3, hunger: -4, thirst: -4 }, outcome: 'You sit in the truck’s shadow and listen to the cooling engine click, though it has been dead for hours.'
      }),
      A('final_push', 'MAKE THE FINAL PUSH', {
        risk: 'HIGH', next: 'suburbs', time: 85, miles: -5.7, effects: { energy: -18, thirst: -13, hunger: -10, morale: 8 }, score: 60,
        outcome: 'You keep moving after your body submits its formal objection. The first familiar street sign appears at the top of the rise.'
      })
    ]
  },

  suburbs: {
    id: 'suburbs',
    title: 'HOME',
    kicker: '0.0 MILES REMAINING',
    art: '⌂',
    caption: 'The porch light is dead. The people are not.',
    description: 'Your street is dark, but figures are running toward you. For the first time since 3:47, the silence breaks for the right reason.',
    objective: 'You made it home.',
    actions: [
      A('finish', 'ENTER HOME', { special: 'victory', time: 1, effects: { morale: 20 }, score: 100, outcome: 'The door opens. Arms close around you. The city is still dark, but the commute is over.' })
    ]
  }
};

export const STATIC_ENDINGS = {
  destroy: {
    id: 'destroy',
    title: 'BREAK THE SIGNAL',
    description: 'You fire into the core until the impossible corridor folds inward.',
    effects: { morale: 12, energy: -4 }, flag: 'signal-destroyed', score: 60
  },
  listen: {
    id: 'listen',
    title: 'LISTEN',
    description: 'The signal shows you the blackout spreading backward from a point beneath the river.',
    effects: { morale: -5 }, flag: 'signal-heard', item: 'Signal Coordinates', score: 75
  },
  fragment: {
    id: 'fragment',
    title: 'TAKE A FRAGMENT',
    description: 'You tear a violet shard from the core. It remains cold when you wake.',
    effects: { morale: 4, energy: -6 }, flag: 'signal-fragment', item: 'Signal Fragment', score: 90
  },
  wake: {
    id: 'wake',
    title: 'FORCE YOURSELF AWAKE',
    description: 'You reject the corridor and wake with blood under your fingernails.',
    effects: { morale: -2, energy: 2 }, flag: 'signal-refused', score: 35
  }
};

export const ITEM_ICONS = {
  'Granola Bar': '▰',
  'Water Bottle': '◆',
  'Paper Map': '▧',
  'Swiss Army Knife': '†',
  'Building Evacuation Card': '▤',
  'Hand-Crank Flashlight': '◉',
  'Basement Key': '⚿',
  'Folding Bicycle': '○',
  'First Aid Kit': '+',
  'Hand-Crank Radio': '◫',
  'Food Pack': '▦',
  'Rail Gate Key': '⚿',
  'Service Tunnel Pass': '▥',
  'Signal Coordinates': '⌖',
  'Signal Fragment': '◇'
};
