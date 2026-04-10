// ============================================================
// ONE PIECE: CARD VOYAGE - Game Engine
// A Slay the Spire-inspired roguelike deck builder
// ============================================================

(function () {
  'use strict';

  // ---- Character Definitions ----
  const CHARACTERS = {
    luffy: {
      id: 'luffy',
      name: 'Monkey D. Luffy',
      emoji: '\u{1F451}',
      battleEmoji: '\u{1F44A}',
      role: 'Attacker',
      hp: 80,
      description: 'The future Pirate King! Luffy overwhelms enemies with relentless combos. His Gear abilities ramp up damage but cost more energy. Best for aggressive, all-in playstyles.',
      starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'gum_gum_pistol'],
    },
    zoro: {
      id: 'zoro',
      name: 'Roronoa Zoro',
      emoji: '\u{2694}\uFE0F',
      battleEmoji: '\u{1F5E1}\uFE0F',
      role: 'Devastator',
      hp: 90,
      description: 'The three-sword swordsman who cuts through anything. Zoro deals massive damage with heavy strikes and can build up Strength to scale his attacks over a fight.',
      starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'three_sword_style'],
    },
    nami: {
      id: 'nami',
      name: 'Nami',
      emoji: '\u{1F329}\uFE0F',
      battleEmoji: '\u{26A1}',
      role: 'Controller',
      hp: 70,
      description: 'The navigator who commands the weather. Nami weakens enemies with debuffs and controls the battlefield with AoE attacks. She trades raw power for strategic superiority.',
      starterDeck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'defend', 'thunderbolt_tempo'],
    },
    sanji: {
      id: 'sanji',
      name: 'Vinsmoke Sanji',
      emoji: '\u{1F525}',
      battleEmoji: '\u{1F9B5}',
      role: 'Rogue',
      hp: 75,
      description: 'The chef with blazing kicks. Sanji uses speed and evasion to avoid damage while delivering precise, powerful strikes. He can draw extra cards to fuel devastating combos.',
      starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'diable_jambe'],
    },
  };

  // ---- Card Database ----
  const CARDS = {
    // -- Shared Basic --
    strike: {
      id: 'strike', name: 'Strike', cost: 1, type: 'attack', icon: '\u{2694}\uFE0F',
      desc: 'Deal 6 damage.', effect: { damage: 6 },
      upgraded: { name: 'Strike+', desc: 'Deal 9 damage.', effect: { damage: 9 } },
    },
    defend: {
      id: 'defend', name: 'Defend', cost: 1, type: 'skill', icon: '\u{1F6E1}\uFE0F',
      desc: 'Gain 5 Block.', effect: { block: 5 },
      upgraded: { name: 'Defend+', desc: 'Gain 8 Block.', effect: { block: 8 } },
    },

    // -- Luffy Cards --
    gum_gum_pistol: {
      id: 'gum_gum_pistol', name: 'Gum-Gum Pistol', cost: 1, type: 'attack', icon: '\u{1F44A}',
      desc: 'Deal 8 damage.', effect: { damage: 8 },
      upgraded: { name: 'Gum-Gum Pistol+', desc: 'Deal 12 damage.', effect: { damage: 12 } },
    },
    gum_gum_gatling: {
      id: 'gum_gum_gatling', name: 'Gum-Gum Gatling', cost: 2, type: 'attack', icon: '\u{1F4A5}',
      desc: 'Deal 3 damage 4 times.', effect: { damage: 3, hits: 4 },
      upgraded: { name: 'Gum-Gum Gatling+', desc: 'Deal 4 damage 5 times.', effect: { damage: 4, hits: 5 } },
    },
    gear_second: {
      id: 'gear_second', name: 'Gear Second', cost: 1, type: 'power', icon: '\u{1F4A8}',
      desc: 'Gain 2 Strength.', effect: { buff: 'strength', value: 2 },
      upgraded: { name: 'Gear Second+', desc: 'Gain 3 Strength.', effect: { buff: 'strength', value: 3 } },
    },
    red_hawk: {
      id: 'red_hawk', name: 'Red Hawk', cost: 2, type: 'attack', icon: '\u{1F525}',
      desc: 'Deal 16 damage. Apply 1 Vulnerable.', effect: { damage: 16, debuff: 'vulnerable', debuffVal: 1 },
      upgraded: { name: 'Red Hawk+', desc: 'Deal 20 damage. Apply 2 Vulnerable.', effect: { damage: 20, debuff: 'vulnerable', debuffVal: 2 } },
    },
    haki_burst: {
      id: 'haki_burst', name: 'Haki Burst', cost: 1, type: 'skill', icon: '\u{1F300}',
      desc: 'Gain 8 Block. Draw 1 card.', effect: { block: 8, draw: 1 },
      upgraded: { name: 'Haki Burst+', desc: 'Gain 11 Block. Draw 1 card.', effect: { block: 11, draw: 1 } },
    },
    kings_haki: {
      id: 'kings_haki', name: "King's Haki", cost: 2, type: 'skill', icon: '\u{1F451}',
      desc: 'Apply 2 Weak to ALL enemies.', effect: { debuffAll: 'weak', debuffVal: 2 },
      upgraded: { name: "King's Haki+", desc: 'Apply 3 Weak to ALL enemies.', effect: { debuffAll: 'weak', debuffVal: 3 } },
    },
    gear_fourth: {
      id: 'gear_fourth', name: 'Gear Fourth', cost: 3, type: 'attack', icon: '\u{1F4AA}',
      desc: 'Deal 30 damage.', effect: { damage: 30 },
      upgraded: { name: 'Gear Fourth+', desc: 'Deal 40 damage.', effect: { damage: 40 } },
    },

    // -- Zoro Cards --
    three_sword_style: {
      id: 'three_sword_style', name: 'Three-Sword Style', cost: 1, type: 'attack', icon: '\u{2694}\uFE0F',
      desc: 'Deal 3 damage 3 times.', effect: { damage: 3, hits: 3 },
      upgraded: { name: 'Three-Sword Style+', desc: 'Deal 4 damage 3 times.', effect: { damage: 4, hits: 3 } },
    },
    onigiri: {
      id: 'onigiri', name: 'Oni Giri', cost: 2, type: 'attack', icon: '\u{1F32A}\uFE0F',
      desc: 'Deal 14 damage. Gain 4 Block.', effect: { damage: 14, block: 4 },
      upgraded: { name: 'Oni Giri+', desc: 'Deal 18 damage. Gain 6 Block.', effect: { damage: 18, block: 6 } },
    },
    shishi_sonson: {
      id: 'shishi_sonson', name: 'Shishi Sonson', cost: 2, type: 'attack', icon: '\u{1F4A8}',
      desc: 'Deal 22 damage.', effect: { damage: 22 },
      upgraded: { name: 'Shishi Sonson+', desc: 'Deal 28 damage.', effect: { damage: 28 } },
    },
    asura: {
      id: 'asura', name: 'Asura', cost: 3, type: 'attack', icon: '\u{1F479}',
      desc: 'Deal 7 damage 4 times.', effect: { damage: 7, hits: 4 },
      upgraded: { name: 'Asura+', desc: 'Deal 9 damage 4 times.', effect: { damage: 9, hits: 4 } },
    },
    iron_body: {
      id: 'iron_body', name: 'Iron Body', cost: 2, type: 'skill', icon: '\u{1F6E1}\uFE0F',
      desc: 'Gain 15 Block.', effect: { block: 15 },
      upgraded: { name: 'Iron Body+', desc: 'Gain 20 Block.', effect: { block: 20 } },
    },
    demon_aura: {
      id: 'demon_aura', name: 'Demon Aura', cost: 1, type: 'power', icon: '\u{1F525}',
      desc: 'Gain 2 Strength.', effect: { buff: 'strength', value: 2 },
      upgraded: { name: 'Demon Aura+', desc: 'Gain 3 Strength.', effect: { buff: 'strength', value: 3 } },
    },
    nothing_happened: {
      id: 'nothing_happened', name: 'Nothing Happened', cost: 1, type: 'skill', icon: '\u{1FA78}',
      desc: 'Gain 12 Block. Take 5 damage.', effect: { block: 12, selfDamage: 5 },
      upgraded: { name: 'Nothing Happened+', desc: 'Gain 18 Block. Take 5 damage.', effect: { block: 18, selfDamage: 5 } },
    },

    // -- Nami Cards --
    thunderbolt_tempo: {
      id: 'thunderbolt_tempo', name: 'Thunderbolt Tempo', cost: 1, type: 'attack', icon: '\u{26A1}',
      desc: 'Deal 7 damage. Apply 1 Weak.', effect: { damage: 7, debuff: 'weak', debuffVal: 1 },
      upgraded: { name: 'Thunderbolt Tempo+', desc: 'Deal 10 damage. Apply 1 Weak.', effect: { damage: 10, debuff: 'weak', debuffVal: 1 } },
    },
    mirage_tempo: {
      id: 'mirage_tempo', name: 'Mirage Tempo', cost: 1, type: 'skill', icon: '\u{1F32B}\uFE0F',
      desc: 'Gain 6 Block. Apply 1 Weak to target.', effect: { block: 6, debuff: 'weak', debuffVal: 1 },
      upgraded: { name: 'Mirage Tempo+', desc: 'Gain 9 Block. Apply 1 Weak to target.', effect: { block: 9, debuff: 'weak', debuffVal: 1 } },
    },
    cyclone_tempo: {
      id: 'cyclone_tempo', name: 'Cyclone Tempo', cost: 2, type: 'attack', icon: '\u{1F32A}\uFE0F',
      desc: 'Deal 5 damage to ALL enemies. Apply 1 Vulnerable to ALL.', effect: { damageAll: 5, debuffAll: 'vulnerable', debuffVal: 1 },
      upgraded: { name: 'Cyclone Tempo+', desc: 'Deal 8 damage to ALL enemies. Apply 1 Vulnerable to ALL.', effect: { damageAll: 8, debuffAll: 'vulnerable', debuffVal: 1 } },
    },
    thunder_lance: {
      id: 'thunder_lance', name: 'Thunder Lance', cost: 2, type: 'attack', icon: '\u{1F329}\uFE0F',
      desc: 'Deal 18 damage. Apply 2 Vulnerable.', effect: { damage: 18, debuff: 'vulnerable', debuffVal: 2 },
      upgraded: { name: 'Thunder Lance+', desc: 'Deal 24 damage. Apply 2 Vulnerable.', effect: { damage: 24, debuff: 'vulnerable', debuffVal: 2 } },
    },
    weather_egg: {
      id: 'weather_egg', name: 'Weather Egg', cost: 1, type: 'skill', icon: '\u{1F95A}',
      desc: 'Draw 2 cards.', effect: { draw: 2 },
      upgraded: { name: 'Weather Egg+', cost: 0, desc: 'Draw 2 cards.', effect: { draw: 2 } },
    },
    forecast: {
      id: 'forecast', name: 'Forecast', cost: 1, type: 'power', icon: '\u{2601}\uFE0F',
      desc: 'Gain 1 Dexterity.', effect: { buff: 'dexterity', value: 1 },
      upgraded: { name: 'Forecast+', desc: 'Gain 2 Dexterity.', effect: { buff: 'dexterity', value: 2 } },
    },
    clima_tact: {
      id: 'clima_tact', name: 'Clima-Tact', cost: 2, type: 'attack', icon: '\u{1FA84}',
      desc: 'Deal 10 damage to ALL enemies.', effect: { damageAll: 10 },
      upgraded: { name: 'Clima-Tact+', desc: 'Deal 14 damage to ALL enemies.', effect: { damageAll: 14 } },
    },

    // -- Sanji Cards --
    diable_jambe: {
      id: 'diable_jambe', name: 'Diable Jambe', cost: 1, type: 'attack', icon: '\u{1F9B5}',
      desc: 'Deal 8 damage. Draw 1 card.', effect: { damage: 8, draw: 1 },
      upgraded: { name: 'Diable Jambe+', desc: 'Deal 12 damage. Draw 1 card.', effect: { damage: 12, draw: 1 } },
    },
    concasse: {
      id: 'concasse', name: 'Concasse', cost: 1, type: 'attack', icon: '\u{1F4A2}',
      desc: 'Deal 10 damage.', effect: { damage: 10 },
      upgraded: { name: 'Concasse+', desc: 'Deal 14 damage.', effect: { damage: 14 } },
    },
    party_table: {
      id: 'party_table', name: 'Party Table', cost: 2, type: 'attack', icon: '\u{1F372}',
      desc: 'Deal 4 damage 4 times.', effect: { damage: 4, hits: 4 },
      upgraded: { name: 'Party Table+', desc: 'Deal 5 damage 4 times.', effect: { damage: 5, hits: 4 } },
    },
    sky_walk: {
      id: 'sky_walk', name: 'Sky Walk', cost: 1, type: 'skill', icon: '\u{1F4A8}',
      desc: 'Gain 7 Block. Draw 1 card.', effect: { block: 7, draw: 1 },
      upgraded: { name: 'Sky Walk+', desc: 'Gain 10 Block. Draw 1 card.', effect: { block: 10, draw: 1 } },
    },
    hell_memories: {
      id: 'hell_memories', name: 'Hell Memories', cost: 3, type: 'attack', icon: '\u{1F525}',
      desc: 'Deal 12 damage to ALL enemies.', effect: { damageAll: 12 },
      upgraded: { name: 'Hell Memories+', desc: 'Deal 16 damage to ALL enemies.', effect: { damageAll: 16 } },
    },
    chivalry: {
      id: 'chivalry', name: 'Chivalry', cost: 0, type: 'skill', icon: '\u{1F339}',
      desc: 'Gain 4 Block. Draw 1 card.', effect: { block: 4, draw: 1 },
      upgraded: { name: 'Chivalry+', desc: 'Gain 6 Block. Draw 1 card.', effect: { block: 6, draw: 1 } },
    },
    ifrit_jambe: {
      id: 'ifrit_jambe', name: 'Ifrit Jambe', cost: 2, type: 'attack', icon: '\u{1F31F}',
      desc: 'Deal 20 damage. Apply 1 Weak.', effect: { damage: 20, debuff: 'weak', debuffVal: 1 },
      upgraded: { name: 'Ifrit Jambe+', desc: 'Deal 26 damage. Apply 2 Weak.', effect: { damage: 26, debuff: 'weak', debuffVal: 2 } },
    },

    // -- Shared (reward pool) --
    bandage: {
      id: 'bandage', name: 'Bandage', cost: 1, type: 'skill', icon: '\u{1FA79}',
      desc: 'Heal 6 HP.', effect: { heal: 6 },
      upgraded: { name: 'Bandage+', desc: 'Heal 10 HP.', effect: { heal: 10 } },
    },
    meat: {
      id: 'meat', name: 'Meat!', cost: 0, type: 'skill', icon: '\u{1F356}',
      desc: 'Heal 4 HP. Draw 1 card.', effect: { heal: 4, draw: 1 },
      upgraded: { name: 'Meat!+', desc: 'Heal 7 HP. Draw 1 card.', effect: { heal: 7, draw: 1 } },
    },
    bravery: {
      id: 'bravery', name: 'Bravery', cost: 1, type: 'skill', icon: '\u{1F31F}',
      desc: 'Draw 3 cards.', effect: { draw: 3 },
      upgraded: { name: 'Bravery+', cost: 0, desc: 'Draw 3 cards.', effect: { draw: 3 } },
    },
    nakama_power: {
      id: 'nakama_power', name: 'Nakama Power', cost: 1, type: 'power', icon: '\u{2764}\uFE0F',
      desc: 'Gain 3 Block at the start of each turn.', effect: { buff: 'autoBlock', value: 3 },
      upgraded: { name: 'Nakama Power+', desc: 'Gain 5 Block at the start of each turn.', effect: { buff: 'autoBlock', value: 5 } },
    },
    will_of_d: {
      id: 'will_of_d', name: 'Will of D.', cost: 2, type: 'power', icon: '\u{1F480}',
      desc: 'Gain 2 Strength. Gain 1 Dexterity.', effect: { buff: 'strength', value: 2, buff2: 'dexterity', value2: 1 },
      upgraded: { name: 'Will of D.+', desc: 'Gain 3 Strength. Gain 2 Dexterity.', effect: { buff: 'strength', value: 3, buff2: 'dexterity', value2: 2 } },
    },
  };

  // Character-specific card pools for rewards
  const CHAR_CARDS = {
    luffy: ['gum_gum_pistol', 'gum_gum_gatling', 'gear_second', 'red_hawk', 'haki_burst', 'kings_haki', 'gear_fourth'],
    zoro: ['three_sword_style', 'onigiri', 'shishi_sonson', 'asura', 'iron_body', 'demon_aura', 'nothing_happened'],
    nami: ['thunderbolt_tempo', 'mirage_tempo', 'cyclone_tempo', 'thunder_lance', 'weather_egg', 'forecast', 'clima_tact'],
    sanji: ['diable_jambe', 'concasse', 'party_table', 'sky_walk', 'hell_memories', 'chivalry', 'ifrit_jambe'],
  };

  const SHARED_CARDS = ['bandage', 'meat', 'bravery', 'nakama_power', 'will_of_d'];

  // ---- Enemy Definitions ----
  const ENEMIES = {
    // Floor 1 enemies
    marine_soldier: { name: 'Marine Soldier', emoji: '\u{1F482}', hp: 18, actions: [
      { type: 'attack', damage: 6 }, { type: 'attack', damage: 8 }, { type: 'defend', block: 5 },
    ]},
    sea_king: { name: 'Sea King', emoji: '\u{1F40D}', hp: 25, actions: [
      { type: 'attack', damage: 10 }, { type: 'attack', damage: 7 }, { type: 'defend', block: 6 },
    ]},
    bandit: { name: 'Bandit', emoji: '\u{1F9B9}', hp: 15, actions: [
      { type: 'attack', damage: 5 }, { type: 'attack', damage: 9 }, { type: 'attack', damage: 5 },
    ]},
    pirate_grunt: { name: 'Pirate Grunt', emoji: '\u{1F3F4}\u200D\u2620\uFE0F', hp: 20, actions: [
      { type: 'attack', damage: 7 }, { type: 'defend', block: 4 }, { type: 'attack', damage: 11 },
    ]},
    // Floor 2 enemies
    fishman: { name: 'Fishman', emoji: '\u{1F420}', hp: 30, actions: [
      { type: 'attack', damage: 9 }, { type: 'attack', damage: 12 }, { type: 'defend', block: 8 },
    ]},
    baroque_agent: { name: 'Baroque Agent', emoji: '\u{1F574}\uFE0F', hp: 35, actions: [
      { type: 'attack', damage: 10 }, { type: 'buff', buff: 'strength', value: 1 }, { type: 'attack', damage: 14 },
    ]},
    marine_captain: { name: 'Marine Captain', emoji: '\u{1F396}\uFE0F', hp: 40, actions: [
      { type: 'attack', damage: 11 }, { type: 'defend', block: 10 }, { type: 'attack', damage: 15 },
    ]},
    // Floor 3 enemies
    cp9_agent: { name: 'CP9 Agent', emoji: '\u{1F575}\uFE0F', hp: 50, actions: [
      { type: 'attack', damage: 14 }, { type: 'attack', damage: 10 }, { type: 'buff', buff: 'strength', value: 2 }, { type: 'attack', damage: 18 },
    ]},
    pacifista: { name: 'Pacifista', emoji: '\u{1F916}', hp: 60, actions: [
      { type: 'attack', damage: 16 }, { type: 'defend', block: 12 }, { type: 'attack', damage: 20 },
    ]},

    // Elites
    don_krieg: { name: 'Don Krieg', emoji: '\u{1F6E1}\uFE0F', hp: 45, actions: [
      { type: 'attack', damage: 10 }, { type: 'defend', block: 12 }, { type: 'attack', damage: 15 }, { type: 'buff', buff: 'strength', value: 2 },
    ]},
    arlong: { name: 'Arlong', emoji: '\u{1F988}', hp: 55, actions: [
      { type: 'attack', damage: 14 }, { type: 'attack', damage: 10 }, { type: 'attack', damage: 18 },
    ]},
    crocodile: { name: 'Crocodile', emoji: '\u{1F40A}', hp: 70, actions: [
      { type: 'attack', damage: 12 }, { type: 'debuff', debuff: 'weak', value: 2 }, { type: 'attack', damage: 20 }, { type: 'defend', block: 10 },
    ]},
    enel: { name: 'Enel', emoji: '\u{26A1}', hp: 80, actions: [
      { type: 'attack', damage: 18 }, { type: 'attack', damage: 12 }, { type: 'buff', buff: 'strength', value: 3 }, { type: 'attack', damage: 22 },
    ]},

    // Bosses
    buggy: { name: 'Captain Buggy', emoji: '\u{1F921}', hp: 60, actions: [
      { type: 'attack', damage: 8 }, { type: 'attack', damage: 12 }, { type: 'defend', block: 8 }, { type: 'buff', buff: 'strength', value: 2 },
    ]},
    smoker: { name: 'Captain Smoker', emoji: '\u{1F32B}\uFE0F', hp: 85, actions: [
      { type: 'attack', damage: 12 }, { type: 'defend', block: 14 }, { type: 'attack', damage: 16 }, { type: 'debuff', debuff: 'weak', value: 1 },
    ]},
    doflamingo: { name: 'Doflamingo', emoji: '\u{1F339}', hp: 120, actions: [
      { type: 'attack', damage: 15 }, { type: 'debuff', debuff: 'vulnerable', value: 2 }, { type: 'attack', damage: 20 }, { type: 'buff', buff: 'strength', value: 3 }, { type: 'attack', damage: 25 },
    ]},
  };

  const FLOOR_ENEMIES = [
    ['marine_soldier', 'sea_king', 'bandit', 'pirate_grunt'],
    ['fishman', 'baroque_agent', 'marine_captain'],
    ['cp9_agent', 'pacifista'],
  ];
  const FLOOR_ELITES = [
    ['don_krieg'],
    ['arlong', 'crocodile'],
    ['enel'],
  ];
  const FLOOR_BOSSES = ['buggy', 'smoker', 'doflamingo'];

  // ---- Game State ----
  const state = {
    character: null,
    maxHp: 0,
    hp: 0,
    gold: 0,
    floor: 0,       // 0-indexed, 3 floors total
    deck: [],        // Array of card instances { ...cardDef, uid }
    drawPile: [],
    hand: [],
    discardPile: [],
    energy: 0,
    maxEnergy: 3,
    block: 0,
    buffs: {},       // { strength: 0, dexterity: 0, autoBlock: 0 }
    enemies: [],
    turn: 0,
    selectedCard: null,
    map: [],
    currentNode: null,
    visitedNodes: new Set(),
    combatRewards: null,
    floorsCleared: 0,
    enemiesKilled: 0,
    cardsPlayed: 0,
  };

  let uidCounter = 0;
  function uid() { return ++uidCounter; }

  // ---- Utility ----
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function makeCardInstance(cardId, isUpgraded = false) {
    const base = CARDS[cardId];
    if (!base) return null;
    const inst = { ...base, uid: uid(), isUpgraded: false };
    if (isUpgraded && base.upgraded) {
      inst.name = base.upgraded.name;
      inst.desc = base.upgraded.desc;
      inst.effect = { ...base.upgraded.effect };
      if (base.upgraded.cost !== undefined) inst.cost = base.upgraded.cost;
      inst.isUpgraded = true;
    } else {
      inst.effect = { ...base.effect };
    }
    return inst;
  }

  // ---- Screen Management ----
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function showModal(id) {
    document.getElementById(id).classList.add('active');
  }

  function hideModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  // ---- Rendering Helpers ----
  function renderCard(card, extraClass = '') {
    const div = document.createElement('div');
    div.className = `game-card type-${card.type} ${card.isUpgraded ? 'card-upgraded' : ''} ${extraClass}`;
    div.dataset.uid = card.uid;
    div.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-icon">${card.icon}</div>
      <div class="card-desc">${getCardDescription(card)}</div>
      <div class="card-type-label">${card.type}</div>
    `;
    return div;
  }

  function getCardDescription(card) {
    const e = card.effect;
    const str = state.buffs.strength || 0;
    const dex = state.buffs.dexterity || 0;
    let desc = card.desc;

    // Show actual damage with strength bonus
    if (e.damage) {
      const actual = e.damage + str;
      if (str > 0) {
        desc = desc.replace(/Deal \d+/, `Deal ${actual}`);
      }
    }
    if (e.damageAll) {
      const actual = e.damageAll + str;
      if (str > 0) {
        desc = desc.replace(/Deal \d+/, `Deal ${actual}`);
      }
    }
    if (e.block) {
      const actual = e.block + dex;
      if (dex > 0) {
        desc = desc.replace(/Gain \d+ Block/, `Gain ${actual} Block`);
      }
    }
    return desc;
  }

  // ---- TITLE SCREEN ----
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('select-screen');
    renderCharacterSelect();
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    showModal('help-modal');
  });

  document.getElementById('btn-close-help').addEventListener('click', () => {
    hideModal('help-modal');
  });

  // ---- CHARACTER SELECT ----
  let selectedCharId = null;

  function renderCharacterSelect() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';
    for (const char of Object.values(CHARACTERS)) {
      const div = document.createElement('div');
      div.className = 'char-card';
      div.dataset.id = char.id;
      div.innerHTML = `
        <span class="char-emoji">${char.emoji}</span>
        <div class="char-name">${char.name.split(' ').pop()}</div>
        <div class="char-role">${char.role}</div>
      `;
      div.addEventListener('click', () => selectCharacter(char.id));
      grid.appendChild(div);
    }
  }

  function selectCharacter(charId) {
    selectedCharId = charId;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.char-card[data-id="${charId}"]`).classList.add('selected');
    document.getElementById('btn-embark').disabled = false;

    const char = CHARACTERS[charId];
    const detail = document.getElementById('character-detail');
    const starterCards = char.starterDeck.map(id => CARDS[id].name);
    const uniqueCards = [...new Set(starterCards)];
    detail.innerHTML = `
      <div class="detail-content">
        <div class="detail-left">
          <div class="detail-emoji">${char.emoji}</div>
          <div class="detail-hp">\u2764\uFE0F ${char.hp} HP</div>
        </div>
        <div class="detail-right">
          <h3>${char.name}</h3>
          <div class="detail-role">${char.role}</div>
          <p class="detail-desc">${char.description}</p>
          <div class="detail-starter-cards">
            <h4>Starter Deck</h4>
            <div class="starter-card-list">
              ${uniqueCards.map(n => `<span class="starter-tag">${n}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  document.getElementById('btn-embark').addEventListener('click', () => {
    if (!selectedCharId) return;
    startGame(selectedCharId);
  });

  document.getElementById('btn-back-title').addEventListener('click', () => {
    showScreen('title-screen');
  });

  // ---- GAME INITIALIZATION ----
  function startGame(charId) {
    const char = CHARACTERS[charId];
    state.character = char;
    state.maxHp = char.hp;
    state.hp = char.hp;
    state.gold = 99;
    state.floor = 0;
    state.deck = char.starterDeck.map(id => makeCardInstance(id));
    state.buffs = { strength: 0, dexterity: 0, autoBlock: 0 };
    state.floorsCleared = 0;
    state.enemiesKilled = 0;
    state.cardsPlayed = 0;
    state.visitedNodes = new Set();
    uidCounter = state.deck.length + 1;

    generateMap();
    showScreen('map-screen');
    renderMap();
  }

  // ---- MAP GENERATION ----
  const NODE_META = {
    enemy:  { icon: '\u{2694}\uFE0F', label: 'Inimigo',  tip: 'Enfrente uma horda de inimigos' },
    elite:  { icon: '\u{1F480}',      label: 'Elite',    tip: 'Inimigo perigoso, melhor loot' },
    rest:   { icon: '\u{1F525}',      label: 'Descanso', tip: 'Cure vida ou melhore uma carta' },
    shop:   { icon: '\u{1F4B0}',      label: 'Loja',     tip: 'Compre cartas e suprimentos' },
    boss:   { icon: '\u{1F451}',      label: 'BOSS',     tip: 'Derrote para avan\u00e7ar' },
    event:  { icon: '\u{2753}',       label: 'Evento',   tip: 'Um encontro misterioso' },
  };

  function generateMap() {
    state.map = [];
    const floor = state.floor;
    const rows = 7;

    for (let r = 0; r < rows; r++) {
      const row = [];
      let nodeCount;
      if (r === 0) nodeCount = 2 + Math.floor(Math.random() * 2);
      else if (r === rows - 1) nodeCount = 1;
      else {
        // Diamond shape: wider in the middle
        const mid = Math.floor(rows / 2);
        const dist = Math.abs(r - mid);
        if (dist === 0) nodeCount = 3 + Math.floor(Math.random() * 2); // 3-4
        else if (dist === 1) nodeCount = 2 + Math.floor(Math.random() * 2); // 2-3
        else nodeCount = 2;
      }

      for (let c = 0; c < nodeCount; c++) {
        let type;
        if (r === 0) type = 'enemy';
        else if (r === rows - 1) type = 'boss';
        else if (r === Math.floor(rows / 2)) type = pick(['rest', 'shop', 'rest']);
        else {
          const rand = Math.random();
          if (rand < 0.40) type = 'enemy';
          else if (rand < 0.55) type = 'elite';
          else if (rand < 0.72) type = 'rest';
          else if (rand < 0.87) type = 'shop';
          else type = 'event';
        }

        row.push({
          id: `${floor}-${r}-${c}`,
          row: r,
          col: c,
          type,
          connections: [],
        });
      }

      // Connect to next row
      if (state.map.length > 0) {
        const prevRow = state.map[state.map.length - 1];
        for (const node of prevRow) {
          const conn = new Set();
          conn.add(Math.min(node.col, row.length - 1));
          if (Math.random() > 0.35 && row.length > 1) {
            conn.add(Math.floor(Math.random() * row.length));
          }
          node.connections = [...conn];
        }
      }

      state.map.push(row);
    }

    state.currentNode = null;
  }

  function renderMap() {
    updateMapHeader();
    const nodesLayer = document.getElementById('map-nodes');
    const svg = document.getElementById('map-svg');
    nodesLayer.innerHTML = '';
    svg.innerHTML = '';

    // Store DOM refs for line drawing
    const nodeEls = {};

    // Render rows from top (boss) to bottom (start)
    for (let r = state.map.length - 1; r >= 0; r--) {
      const row = state.map[r];
      const rowDiv = document.createElement('div');
      rowDiv.className = 'map-row';

      for (const node of row) {
        const meta = NODE_META[node.type] || NODE_META.event;
        const el = document.createElement('div');
        el.className = `map-node type-${node.type}`;
        el.dataset.nodeId = node.id;

        if (state.visitedNodes.has(node.id)) el.classList.add('visited');
        if (state.currentNode && state.currentNode.id === node.id) el.classList.add('current');

        if (isNodeAvailable(node)) {
          el.classList.add('available');
          el.addEventListener('click', () => visitNode(node));
        }

        el.innerHTML = `
          <span>${meta.icon}</span>
          <div class="node-tip">
            <span class="tip-title">${meta.label}</span>
            ${meta.tip}
          </div>
        `;

        rowDiv.appendChild(el);
        nodeEls[node.id] = el;
      }

      nodesLayer.appendChild(rowDiv);
    }

    // Draw SVG connection lines + position player marker after DOM layout
    requestAnimationFrame(() => {
      drawMapLines(nodeEls, svg);
      positionPlayerMarker(nodeEls);
    });
  }

  function positionPlayerMarker(nodeEls) {
    const marker = document.getElementById('map-player-marker');
    if (!marker || !state.currentNode) {
      if (marker) marker.style.display = 'none';
      return;
    }
    const el = nodeEls[state.currentNode.id];
    if (!el) { marker.style.display = 'none'; return; }

    const parchment = el.closest('.map-scroll-area');
    if (!parchment) { marker.style.display = 'none'; return; }
    const pRect = parchment.getBoundingClientRect();
    const nRect = el.getBoundingClientRect();

    marker.textContent = state.character.emoji;
    marker.style.display = 'block';
    marker.style.left = (nRect.left + nRect.width / 2 - pRect.left) + 'px';
    marker.style.top = (nRect.top - pRect.top - 4) + 'px';
  }

  function drawMapLines(nodeEls, svg) {
    const vpRect = document.getElementById('map-container').getBoundingClientRect();
    svg.setAttribute('width', vpRect.width);
    svg.setAttribute('height', document.getElementById('map-nodes').scrollHeight);
    svg.style.height = document.getElementById('map-nodes').scrollHeight + 'px';

    // We iterate bottom-up (row 0 = start) and draw lines to connected nodes in next row
    for (let r = 0; r < state.map.length - 1; r++) {
      const row = state.map[r];
      const nextRow = state.map[r + 1];
      for (const node of row) {
        const fromEl = nodeEls[node.id];
        if (!fromEl) continue;

        for (const ci of node.connections) {
          const target = nextRow[ci];
          if (!target) continue;
          const toEl = nodeEls[target.id];
          if (!toEl) continue;

          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          const x1 = fromRect.left + fromRect.width / 2 - vpRect.left;
          const y1 = fromRect.top + fromRect.height / 2 - vpRect.top;
          const x2 = toRect.left + toRect.width / 2 - vpRect.left;
          const y2 = toRect.top + toRect.height / 2 - vpRect.top;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);

          // Style: visited, available, or default
          const fromVisited = state.visitedNodes.has(node.id);
          const toAvailable = isNodeAvailable(target);

          if (fromVisited && state.visitedNodes.has(target.id)) {
            line.classList.add('path-visited');
          } else if (fromVisited || (state.currentNode && state.currentNode.id === node.id && toAvailable)) {
            line.classList.add('path-available');
          }

          svg.appendChild(line);
        }
      }
    }
  }

  function isNodeAvailable(node) {
    if (state.visitedNodes.has(node.id)) return false;
    if (node.row === 0 && !state.currentNode) return true;
    if (!state.currentNode) return false;
    if (node.row !== state.currentNode.row + 1) return false;
    return state.currentNode.connections.includes(node.col);
  }

  function updateMapHeader() {
    document.getElementById('map-avatar').textContent = state.character.emoji;
    document.getElementById('map-hp').textContent = `\u2764\uFE0F ${state.hp}/${state.maxHp}`;
    document.getElementById('map-gold').textContent = `\u{1FA99} ${state.gold}`;
    document.getElementById('map-floor').textContent = `Floor ${state.floor + 1} / 3`;
  }

  function visitNode(node) {
    state.visitedNodes.add(node.id);
    state.currentNode = node;

    switch (node.type) {
      case 'enemy': startCombat(pickEnemies('normal')); break;
      case 'elite': startCombat(pickEnemies('elite')); break;
      case 'boss': startCombat(pickEnemies('boss')); break;
      case 'rest': showRestScreen(); break;
      case 'shop': showShopScreen(); break;
      case 'event': handleEvent(); break;
    }
  }

  function pickEnemies(tier) {
    const floor = state.floor;
    if (tier === 'boss') {
      return [spawnEnemy(FLOOR_BOSSES[clamp(floor, 0, FLOOR_BOSSES.length - 1)])];
    }
    if (tier === 'elite') {
      const pool = FLOOR_ELITES[clamp(floor, 0, FLOOR_ELITES.length - 1)];
      return [spawnEnemy(pick(pool))];
    }
    // Normal - 1 or 2 enemies
    const pool = FLOOR_ENEMIES[clamp(floor, 0, FLOOR_ENEMIES.length - 1)];
    const count = Math.random() > 0.5 ? 2 : 1;
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(spawnEnemy(pick(pool)));
    }
    return result;
  }

  function spawnEnemy(id) {
    const def = ENEMIES[id];
    // Scale HP with floor
    const hpMult = 1 + state.floor * 0.15;
    return {
      id,
      uid: uid(),
      name: def.name,
      emoji: def.emoji,
      maxHp: Math.floor(def.hp * hpMult),
      hp: Math.floor(def.hp * hpMult),
      block: 0,
      actions: def.actions,
      actionIndex: Math.floor(Math.random() * def.actions.length),
      buffs: { strength: 0 },
      debuffs: { weak: 0, vulnerable: 0 },
    };
  }

  // ---- COMBAT ----
  function startCombat(enemies) {
    state.enemies = enemies;
    state.drawPile = shuffle([...state.deck]);
    state.hand = [];
    state.discardPile = [];
    state.block = 0;
    state.energy = state.maxEnergy;
    state.turn = 0;
    state.selectedCard = null;
    // Reset per-combat buffs (keep permanent ones)
    const keep = { ...state.buffs };
    state.buffs = { strength: keep.strength || 0, dexterity: keep.dexterity || 0, autoBlock: keep.autoBlock || 0 };

    showScreen('combat-screen');
    startPlayerTurn();
  }

  // ---- Luffy Frame Animation (using individual PNGs) ----
  let luffyAnimInterval = null;
  const ANIM_FRAMES = {
    idle:    ['luffy-stand.png', 'luffy-stand.png', 'luffy-stand.png'],
    attack:  [
      'luffy-run1.png', 'luffy-run2.png', 'luffy-run3.png',
      'luffy-punch1.png', 'luffy-punch2.png', 'luffy-punch3.png',
      'luffy-punch3.png', 'luffy-run3.png', 'luffy-stand.png'
    ],
    attack2: [
      'luffy-crouch.png', 'luffy-punch1.png',
      'luffy-punch2.png', 'luffy-punch3.png',
      'luffy-punch3.png', 'luffy-stand.png'
    ],
    hit: [
      'luffy-crouch.png', 'luffy-crouch.png',
      'luffy-stand.png'
    ],
  };

  const ANIM_FPS = { idle: 1, attack: 12, attack2: 10, hit: 8 };

  function playAnim(type) {
    const img = document.getElementById('luffy-anim');
    if (!img) return;
    clearInterval(luffyAnimInterval);
    const frames = ANIM_FRAMES[type];
    if (!frames) return;
    let i = 0;
    const fps = ANIM_FPS[type] || 8;
    img.src = 'assets/characters/luffy/' + frames[0];
    luffyAnimInterval = setInterval(function () {
      i++;
      if (i >= frames.length) {
        if (type === 'idle') {
          i = 0;
        } else {
          clearInterval(luffyAnimInterval);
          playAnim('idle');
          return;
        }
      }
      img.src = 'assets/characters/luffy/' + frames[i];
    }, 1000 / fps);
  }

  function changePose(pose) {
    if (pose === 'fight' || pose === 'side') playAnim('idle');
    else if (pose === 'attack1') playAnim('attack');
    else if (pose === 'attack4') playAnim('attack2');
  }

  function startPlayerTurn() {
    state.turn++;
    state.energy = state.maxEnergy;
    state.block = 0;
    state.selectedCard = null;

    // Auto block from power
    if (state.buffs.autoBlock > 0) {
      state.block += state.buffs.autoBlock;
    }

    // Draw 5 cards
    drawCards(5);
    renderCombat();

    if (state.character.id === 'luffy') playAnim('idle', true);
  }

  function drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (state.drawPile.length === 0) {
        if (state.discardPile.length === 0) return;
        state.drawPile = shuffle([...state.discardPile]);
        state.discardPile = [];
      }
      state.hand.push(state.drawPile.pop());
    }
  }

  function renderCombat() {
    // HUD Top - Avatar
    document.getElementById('combat-avatar').textContent = state.character.emoji;

    // HUD Top - HP bar
    const hpPct = (state.hp / state.maxHp) * 100;
    document.getElementById('player-hp-bar').style.width = hpPct + '%';
    document.getElementById('player-hp-text').textContent = `${state.hp}/${state.maxHp}`;

    // HUD Top - Block badge
    document.getElementById('player-block-value').textContent = state.block;
    const blockBadge = document.getElementById('player-block');
    blockBadge.style.display = state.block > 0 ? 'flex' : 'flex';
    blockBadge.style.opacity = state.block > 0 ? '1' : '0.3';

    // HUD Top - Buffs
    renderBuffs();

    // HUD Top - Floor & Gold
    document.getElementById('hud-floor').textContent = state.floor + 1;
    document.getElementById('hud-gold').textContent = state.gold;
    document.getElementById('hud-deck-count').textContent = state.deck.length;

    // Energy orb
    document.getElementById('energy-text').textContent = state.energy;
    document.getElementById('energy-max-text').textContent = `/${state.maxEnergy}`;
    const orb = document.getElementById('energy-orb');
    if (state.energy === 0) orb.classList.add('depleted');
    else orb.classList.remove('depleted');

    // Battlefield - Player sprite, name, HP, block
    const playerSprite = document.getElementById('ba-player-sprite');
    if (state.character.id === 'luffy') {
      if (!document.getElementById('luffy-anim')) {
        playerSprite.innerHTML = '';
        playerSprite.style.cssText = 'width:220px;height:220px;display:block;position:relative;overflow:hidden;flex-shrink:0;';

        const img = document.createElement('img');
        img.id = 'luffy-anim';
        img.src = 'assets/characters/luffy/luffy-stand.png';
        img.style.cssText = 'width:220px;height:220px;object-fit:contain;display:block;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.5));animation:idle-float 2.5s ease-in-out infinite;';
        playerSprite.appendChild(img);

        setTimeout(function () { playAnim('idle'); }, 50);
      }
    } else {
      playerSprite.innerHTML = '';
      playerSprite.removeAttribute('style');
      playerSprite.textContent = state.character.battleEmoji;
      playerSprite.style.width = '200px';
      playerSprite.style.height = '200px';
      playerSprite.style.fontSize = '150px';
      playerSprite.style.lineHeight = '200px';
      playerSprite.style.textAlign = 'center';
      playerSprite.style.display = 'block';
      playerSprite.style.animation = 'idle-float 2.5s ease-in-out infinite';
    }
    document.getElementById('ba-player-name').textContent = state.character.name.split(' ').pop();
    const bfHpPct = (state.hp / state.maxHp) * 100;
    document.getElementById('ba-player-hp').style.width = bfHpPct + '%';
    document.getElementById('ba-player-hp-text').textContent = `${state.hp}/${state.maxHp}`;
    document.getElementById('ba-player-block-val').textContent = state.block;
    const bfBlock = document.getElementById('ba-player-block');
    bfBlock.classList.toggle('hidden', state.block <= 0);

    // Relics
    renderRelics();

    // Enemies
    renderEnemies();

    // Hand
    renderHand();

    // Piles
    document.getElementById('draw-count').textContent = state.drawPile.length;
    document.getElementById('discard-count').textContent = state.discardPile.length;
  }

  function renderBuffs() {
    const container = document.getElementById('hud-buffs');
    container.innerHTML = '';
    const buffs = [
      { key: 'strength', icon: '\u{1F4AA}', label: 'Strength' },
      { key: 'dexterity', icon: '\u{1F6E1}\uFE0F', label: 'Dexterity' },
      { key: 'autoBlock', icon: '\u{1F9F1}', label: 'Auto Block' },
    ];
    for (const b of buffs) {
      const val = state.buffs[b.key] || 0;
      if (val > 0) {
        const div = document.createElement('div');
        div.className = 'hud-buff-icon';
        div.title = `${b.label}: ${val}`;
        div.innerHTML = `${b.icon}<span class="buff-count">${val}</span>`;
        container.appendChild(div);
      }
    }
  }

  const RELICS = [
    { icon: '\u{1F3A9}', name: 'Straw Hat', desc: 'Luffy\'s treasured hat. +5 max HP.' },
    { icon: '\u{2693}', name: 'Anchor', desc: 'Symbol of resolve. +1 energy on first turn.' },
    { icon: '\u{1F356}', name: 'Sea King Meat', desc: 'Heal 2 HP after each combat.' },
    { icon: '\u{1F48E}', name: 'Impact Dial', desc: 'Store damage to unleash later.' },
    { icon: '\u{1F5FA}\uFE0F', name: 'Log Pose', desc: 'Reveals an extra map node.' },
  ];

  function renderRelics() {
    const container = document.getElementById('hud-relics');
    if (container.children.length > 0) return; // only render once
    container.innerHTML = '';
    for (const relic of RELICS) {
      const div = document.createElement('div');
      div.className = 'hud-relic';
      div.innerHTML = `
        ${relic.icon}
        <div class="relic-tooltip">
          <span class="relic-tip-name">${relic.name}</span>
          ${relic.desc}
        </div>
      `;
      container.appendChild(div);
    }
  }

  function renderEnemies() {
    const area = document.getElementById('enemy-area');
    area.innerHTML = '';

    for (const enemy of state.enemies) {
      const div = document.createElement('div');
      div.className = `enemy-unit combatant ${enemy.hp <= 0 ? 'dead' : ''}`;
      div.dataset.uid = enemy.uid;

      const intent = enemy.actions[enemy.actionIndex % enemy.actions.length];
      let intentHTML = '';
      if (intent.type === 'attack') {
        const dmg = intent.damage + (enemy.buffs.strength || 0);
        intentHTML = `<div class="enemy-intent intent-attack">\u{2694} ${dmg} dano</div>`;
      } else if (intent.type === 'defend') {
        intentHTML = `<div class="enemy-intent intent-defend">\u{1F6E1} ${intent.block} bloqueio</div>`;
      } else if (intent.type === 'buff') {
        intentHTML = `<div class="enemy-intent intent-buff">\u{2B06} Buff</div>`;
      } else if (intent.type === 'debuff') {
        intentHTML = `<div class="enemy-intent intent-debuff">\u{2B07} Debuff</div>`;
      }

      const hpPct = (enemy.hp / enemy.maxHp) * 100;

      let statusHTML = '<div class="status-effects">';
      if (enemy.block > 0) statusHTML += `<span class="enemy-block-badge">\u{1F6E1}\uFE0F ${enemy.block}</span>`;
      if (enemy.debuffs.weak > 0) statusHTML += `<span class="status-badge debuff">Weak ${enemy.debuffs.weak}</span>`;
      if (enemy.debuffs.vulnerable > 0) statusHTML += `<span class="status-badge debuff">Vuln ${enemy.debuffs.vulnerable}</span>`;
      statusHTML += '</div>';

      div.innerHTML = `
        ${intentHTML}
        <div class="sprite-emoji">${enemy.emoji}</div>
        <div class="sprite-shadow"></div>
        <div class="enemy-name">${enemy.name}</div>
        <div class="combatant-hp-wrap">
          <div class="combatant-hp-bar">
            <div class="combatant-hp-fill" style="width:${hpPct}%"></div>
            <span class="combatant-hp-text">${enemy.hp}/${enemy.maxHp}</span>
          </div>
        </div>
        ${statusHTML}
      `;

      div.addEventListener('click', () => targetEnemy(enemy));
      area.appendChild(div);

      const spr = div.querySelector('.sprite-emoji');
      if (spr) {
        spr.removeAttribute('style');
        spr.style.width = '140px';
        spr.style.height = '140px';
        spr.style.fontSize = '110px';
        spr.style.lineHeight = '140px';
        spr.style.textAlign = 'center';
        spr.style.display = 'block';
        spr.style.animation = 'idle-float 2.5s ease-in-out infinite';
        spr.style.animationDelay = '0.8s';
      }
    }
  }

  function renderHand() {
    const area = document.getElementById('hand-area');
    area.innerHTML = '';

    for (const card of state.hand) {
      const div = renderCard(card);
      if (card.cost > state.energy) {
        div.classList.add('unplayable');
      }
      if (state.selectedCard && state.selectedCard.uid === card.uid) {
        div.classList.add('selected-card');
      }
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        selectCard(card);
      });
      area.appendChild(div);
    }
  }

  function selectCard(card) {
    if (card.cost > state.energy) return;

    if (state.selectedCard && state.selectedCard.uid === card.uid) {
      state.selectedCard = null;
      renderHand();
      return;
    }

    state.selectedCard = card;

    // If not a targeted card, play immediately
    const e = card.effect;
    const needsTarget = !!(e.damage || e.debuff || e.hits);
    const hasAlive = state.enemies.some(en => en.hp > 0);

    if (!needsTarget || (e.damageAll || e.debuffAll)) {
      playCard(card, null);
    } else if (hasAlive) {
      // Only one enemy alive? auto-target
      const alive = state.enemies.filter(en => en.hp > 0);
      if (alive.length === 1) {
        playCard(card, alive[0]);
      } else {
        renderHand();
      }
    }
  }

  function targetEnemy(enemy) {
    if (!state.selectedCard || enemy.hp <= 0) return;
    playCard(state.selectedCard, enemy);
  }

  function playCard(card, target) {
    if (card.cost > state.energy) return;

    // Luffy spritesheet on card play
    if (state.character.id === 'luffy') {
      if (card.type === 'attack') {
        playAnim('attack');
      } else if (card.type === 'skill') {
        playAnim('attack2');
      }
    }

    state.energy -= card.cost;
    state.cardsPlayed++;
    const e = card.effect;

    // Block
    if (e.block) {
      const total = e.block + (state.buffs.dexterity || 0);
      state.block += total;
      showNumber(document.getElementById('player-combatant'), total, 'block-num');
    }

    // Single target damage
    if (e.damage && target) {
      const hits = e.hits || 1;
      for (let i = 0; i < hits; i++) {
        const dmg = calculateDamage(e.damage + (state.buffs.strength || 0), target);
        dealDamageToEnemy(target, dmg);
      }
    }

    // AoE damage
    if (e.damageAll) {
      for (const enemy of state.enemies) {
        if (enemy.hp > 0) {
          const dmg = calculateDamage(e.damageAll + (state.buffs.strength || 0), enemy);
          dealDamageToEnemy(enemy, dmg);
        }
      }
    }

    // Debuff single
    if (e.debuff && target) {
      target.debuffs[e.debuff] = (target.debuffs[e.debuff] || 0) + e.debuffVal;
    }

    // Debuff all
    if (e.debuffAll) {
      for (const enemy of state.enemies) {
        if (enemy.hp > 0) {
          enemy.debuffs[e.debuffAll] = (enemy.debuffs[e.debuffAll] || 0) + e.debuffVal;
        }
      }
    }

    // Buffs
    if (e.buff) {
      state.buffs[e.buff] = (state.buffs[e.buff] || 0) + e.value;
    }
    if (e.buff2) {
      state.buffs[e.buff2] = (state.buffs[e.buff2] || 0) + e.value2;
    }

    // Heal
    if (e.heal) {
      state.hp = Math.min(state.maxHp, state.hp + e.heal);
      showNumber(document.getElementById('player-combatant'), e.heal, 'heal');
    }

    // Self damage
    if (e.selfDamage) {
      state.hp -= e.selfDamage;
      if (state.hp <= 0) {
        state.hp = 0;
        gameOver();
        return;
      }
    }

    // Draw
    if (e.draw) {
      drawCards(e.draw);
    }

    // Remove card from hand -> discard
    const idx = state.hand.findIndex(c => c.uid === card.uid);
    if (idx >= 0) state.hand.splice(idx, 1);
    state.discardPile.push(card);

    state.selectedCard = null;

    // Check victory
    if (state.enemies.every(en => en.hp <= 0)) {
      setTimeout(() => combatVictory(), 400);
    }

    renderCombat();
  }

  function calculateDamage(baseDmg, target) {
    let dmg = baseDmg;
    if (target.debuffs.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
    return Math.max(0, dmg);
  }

  function dealDamageToEnemy(enemy, damage) {
    if (enemy.block > 0) {
      if (enemy.block >= damage) {
        enemy.block -= damage;
        damage = 0;
      } else {
        damage -= enemy.block;
        enemy.block = 0;
      }
    }
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      state.enemiesKilled++;
    }

    const el = document.querySelector(`.enemy-unit[data-uid="${enemy.uid}"]`);
    if (el && damage > 0) {
      showNumber(el, damage);
      el.querySelector('.sprite-emoji').style.transform = 'translateX(5px)';
      setTimeout(() => {
        const sprite = el.querySelector('.sprite-emoji');
        if (sprite) sprite.style.transform = '';
      }, 150);
    }
  }

  function showNumber(el, value, type = '') {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const num = document.createElement('div');
    num.className = `damage-number ${type}`;
    num.textContent = type === 'heal' ? `+${value}` : type === 'block-num' ? `+${value}` : `-${value}`;
    num.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    num.style.top = (rect.top + Math.random() * 20) + 'px';
    document.body.appendChild(num);
    setTimeout(() => num.remove(), 1000);
  }

  // ---- END TURN ----
  document.getElementById('btn-end-turn').addEventListener('click', endTurn);

  function endTurn() {
    // Discard hand
    state.discardPile.push(...state.hand);
    state.hand = [];
    state.selectedCard = null;

    // Enemy turns
    enemyTurn();
  }

  function enemyTurn() {
    if (state.character.id === 'luffy') changePose('side');

    let delay = 0;
    const alive = state.enemies.filter(en => en.hp > 0);

    for (const enemy of alive) {
      delay += 400;
      setTimeout(() => {
        if (state.hp <= 0) return;

        // Reset enemy block
        enemy.block = 0;

        const action = enemy.actions[enemy.actionIndex % enemy.actions.length];
        enemy.actionIndex++;

        if (action.type === 'attack') {
          let dmg = action.damage + (enemy.buffs.strength || 0);
          if (enemy.debuffs.weak > 0) dmg = Math.floor(dmg * 0.75);

          // Apply damage to player
          let remaining = dmg;
          if (state.block > 0) {
            if (state.block >= remaining) {
              state.block -= remaining;
              remaining = 0;
            } else {
              remaining -= state.block;
              state.block = 0;
            }
          }
          state.hp -= remaining;
          if (remaining > 0) {
            if (state.character.id === 'luffy') playAnim('hit');
            showNumber(document.getElementById('player-combatant'), remaining);
            document.getElementById('combat-screen').classList.add('screen-shake');
            setTimeout(() => document.getElementById('combat-screen').classList.remove('screen-shake'), 300);
          }

          if (state.hp <= 0) {
            state.hp = 0;
            renderCombat();
            setTimeout(gameOver, 500);
            return;
          }
        } else if (action.type === 'defend') {
          enemy.block += action.block;
        } else if (action.type === 'buff') {
          enemy.buffs[action.buff] = (enemy.buffs[action.buff] || 0) + action.value;
        } else if (action.type === 'debuff') {
          // Debuff player (treated as weak for simplicity)
          // We weaken the player by reducing their next turn's damage - simplified as a visual
        }

        renderCombat();
      }, delay);
    }

    // After all enemies act, start player turn
    setTimeout(() => {
      if (state.hp <= 0) return;
      // Tick down debuffs
      for (const enemy of state.enemies) {
        if (enemy.debuffs.weak > 0) enemy.debuffs.weak--;
        if (enemy.debuffs.vulnerable > 0) enemy.debuffs.vulnerable--;
      }
      startPlayerTurn();
    }, delay + 500);
  }

  // ---- COMBAT VICTORY ----
  function combatVictory() {
    const nodeType = state.currentNode ? state.currentNode.type : 'enemy';
    let goldReward = 10 + Math.floor(Math.random() * 15);
    if (nodeType === 'elite') goldReward += 15;
    if (nodeType === 'boss') goldReward += 30;

    state.gold += goldReward;

    // Reset combat buffs (strength/dex) for next fight - only keep autoBlock etc.
    state.buffs.strength = 0;
    state.buffs.dexterity = 0;

    state.combatRewards = { gold: goldReward, nodeType };
    showRewardScreen();
  }

  function showRewardScreen() {
    const container = document.getElementById('reward-container');
    container.innerHTML = '';

    // Gold
    const goldDiv = document.createElement('div');
    goldDiv.className = 'reward-item';
    goldDiv.innerHTML = `<span class="reward-icon">\u{1FA99}</span><span class="reward-text"><span>${state.combatRewards.gold}</span> Gold</span>`;
    container.appendChild(goldDiv);

    // Card reward
    const cardDiv = document.createElement('div');
    cardDiv.className = 'reward-item';
    cardDiv.innerHTML = `<span class="reward-icon">\u{1F0CF}</span><span class="reward-text">Add a card to your deck</span>`;
    cardDiv.addEventListener('click', () => showCardReward());
    container.appendChild(cardDiv);

    // Heal potion (sometimes)
    if (Math.random() > 0.5) {
      const healDiv = document.createElement('div');
      healDiv.className = 'reward-item';
      healDiv.innerHTML = `<span class="reward-icon">\u{2764}\uFE0F</span><span class="reward-text">Heal <span>15</span> HP</span>`;
      healDiv.addEventListener('click', () => {
        state.hp = Math.min(state.maxHp, state.hp + 15);
        healDiv.style.opacity = '0.3';
        healDiv.style.pointerEvents = 'none';
      });
      container.appendChild(healDiv);
    }

    showScreen('reward-screen');
  }

  document.getElementById('btn-reward-continue').addEventListener('click', () => {
    afterNodeComplete();
  });

  function showCardReward() {
    const charCards = CHAR_CARDS[state.character.id];
    const pool = [...charCards, ...SHARED_CARDS];
    const options = shuffle(pool).slice(0, 3);

    const container = document.getElementById('card-reward-options');
    container.innerHTML = '';

    for (const cardId of options) {
      const card = makeCardInstance(cardId);
      const div = renderCard(card);
      div.addEventListener('click', () => {
        state.deck.push(card);
        showScreen('reward-screen');
      });
      container.appendChild(div);
    }

    showScreen('card-reward-screen');
  }

  document.getElementById('btn-skip-card').addEventListener('click', () => {
    showScreen('reward-screen');
  });

  function afterNodeComplete() {
    // Check if boss was defeated
    if (state.currentNode && state.currentNode.type === 'boss') {
      state.floorsCleared++;
      state.floor++;

      if (state.floor >= 3) {
        showVictoryScreen();
        return;
      }

      // Generate new floor map
      state.currentNode = null;
      generateMap();
    }

    showScreen('map-screen');
    renderMap();
  }

  // ---- REST SCREEN ----
  function showRestScreen() {
    showScreen('rest-screen');
  }

  document.getElementById('btn-rest-heal').addEventListener('click', () => {
    const healAmt = Math.floor(state.maxHp * 0.3);
    state.hp = Math.min(state.maxHp, state.hp + healAmt);
    afterNodeComplete();
  });

  document.getElementById('btn-rest-upgrade').addEventListener('click', () => {
    showUpgradeScreen();
  });

  function showUpgradeScreen() {
    const container = document.getElementById('upgrade-cards');
    container.innerHTML = '';

    const upgradeable = state.deck.filter(c => !c.isUpgraded);
    for (const card of upgradeable) {
      const div = renderCard(card);
      div.addEventListener('click', () => {
        upgradeCard(card);
        afterNodeComplete();
      });
      container.appendChild(div);
    }

    if (upgradeable.length === 0) {
      container.innerHTML = '<p style="color: var(--text-dim)">No cards to upgrade.</p>';
    }

    showScreen('upgrade-screen');
  }

  document.getElementById('btn-skip-upgrade').addEventListener('click', () => {
    afterNodeComplete();
  });

  function upgradeCard(card) {
    const base = CARDS[card.id];
    if (!base || !base.upgraded) return;
    card.name = base.upgraded.name;
    card.desc = base.upgraded.desc;
    card.effect = { ...base.upgraded.effect };
    if (base.upgraded.cost !== undefined) card.cost = base.upgraded.cost;
    card.isUpgraded = true;
  }

  // ---- SHOP SCREEN ----
  function showShopScreen() {
    showScreen('shop-screen');
    document.getElementById('shop-gold').textContent = `\u{1FA99} ${state.gold}`;

    const container = document.getElementById('shop-items');
    container.innerHTML = '';

    const charCards = CHAR_CARDS[state.character.id];
    const pool = shuffle([...charCards, ...SHARED_CARDS]).slice(0, 5);

    for (const cardId of pool) {
      const card = makeCardInstance(cardId);
      const price = card.type === 'power' ? 80 : card.type === 'attack' ? 50 : 40;
      price + Math.floor(Math.random() * 20);

      const wrapper = document.createElement('div');
      wrapper.className = 'shop-card-wrapper';

      const cardDiv = renderCard(card);
      const priceSpan = document.createElement('div');
      priceSpan.className = `shop-price ${state.gold < price ? 'cant-afford' : ''}`;
      priceSpan.textContent = `\u{1FA99} ${price}`;

      cardDiv.addEventListener('click', () => {
        if (state.gold >= price) {
          state.gold -= price;
          state.deck.push(card);
          wrapper.style.opacity = '0.2';
          wrapper.style.pointerEvents = 'none';
          document.getElementById('shop-gold').textContent = `\u{1FA99} ${state.gold}`;
        }
      });

      wrapper.appendChild(cardDiv);
      wrapper.appendChild(priceSpan);
      container.appendChild(wrapper);
    }

    // Remove card option
    const removeWrapper = document.createElement('div');
    removeWrapper.className = 'shop-card-wrapper';
    removeWrapper.innerHTML = `
      <div class="game-card type-skill" style="display:flex;align-items:center;justify-content:center;cursor:pointer">
        <div class="card-icon" style="font-size:2.5rem">\u{1F5D1}\uFE0F</div>
        <div class="card-name">Remove a Card</div>
      </div>
      <div class="shop-price ${state.gold < 50 ? 'cant-afford' : ''}">\u{1FA99} 50</div>
    `;
    removeWrapper.addEventListener('click', () => {
      if (state.gold >= 50) {
        showRemoveCardScreen();
      }
    });
    container.appendChild(removeWrapper);
  }

  function showRemoveCardScreen() {
    const container = document.getElementById('upgrade-cards');
    container.innerHTML = '';

    for (const card of state.deck) {
      const div = renderCard(card);
      div.addEventListener('click', () => {
        state.gold -= 50;
        const idx = state.deck.findIndex(c => c.uid === card.uid);
        if (idx >= 0) state.deck.splice(idx, 1);
        showShopScreen();
      });
      container.appendChild(div);
    }

    showScreen('upgrade-screen');
    document.getElementById('btn-skip-upgrade').onclick = () => showShopScreen();
  }

  document.getElementById('btn-back-map-shop').addEventListener('click', () => {
    afterNodeComplete();
  });

  // ---- EVENT ----
  function handleEvent() {
    // Simple random events
    const events = [
      { text: 'You found a treasure chest!', effect: () => { state.gold += 30; } },
      { text: 'A mysterious figure heals your wounds.', effect: () => { state.hp = Math.min(state.maxHp, state.hp + 20); } },
      { text: 'You train under a waterfall.', effect: () => {
        const upgradeable = state.deck.filter(c => !c.isUpgraded);
        if (upgradeable.length > 0) upgradeCard(pick(upgradeable));
      }},
      { text: 'A sea storm damages the ship!', effect: () => { state.hp = Math.max(1, state.hp - 10); } },
    ];

    const event = pick(events);
    event.effect();
    // Show as a quick reward screen
    const container = document.getElementById('reward-container');
    container.innerHTML = `<div class="reward-item"><span class="reward-icon">?</span><span class="reward-text">${event.text}</span></div>`;
    document.querySelector('.reward-title').textContent = 'Event';
    showScreen('reward-screen');
  }

  // ---- GAME OVER ----
  function gameOver() {
    document.getElementById('gameover-subtitle').textContent = `${state.character.name} fell in battle...`;
    document.getElementById('gameover-stats').innerHTML = `
      <div><span class="stat-label">Floor Reached</span><span class="stat-value">${state.floor + 1}</span></div>
      <div><span class="stat-label">Enemies Defeated</span><span class="stat-value">${state.enemiesKilled}</span></div>
      <div><span class="stat-label">Cards Played</span><span class="stat-value">${state.cardsPlayed}</span></div>
      <div><span class="stat-label">Gold Earned</span><span class="stat-value">${state.gold}</span></div>
    `;
    showScreen('gameover-screen');
  }

  document.getElementById('btn-restart').addEventListener('click', () => {
    showScreen('title-screen');
  });

  // ---- VICTORY ----
  function showVictoryScreen() {
    document.getElementById('victory-stats').innerHTML = `
      <div><span class="stat-label">Character</span><span class="stat-value">${state.character.name}</span></div>
      <div><span class="stat-label">Enemies Defeated</span><span class="stat-value">${state.enemiesKilled}</span></div>
      <div><span class="stat-label">Cards Played</span><span class="stat-value">${state.cardsPlayed}</span></div>
      <div><span class="stat-label">Final Deck Size</span><span class="stat-value">${state.deck.length}</span></div>
      <div><span class="stat-label">Gold</span><span class="stat-value">${state.gold}</span></div>
    `;
    showScreen('victory-screen');
  }

  document.getElementById('btn-new-voyage').addEventListener('click', () => {
    showScreen('title-screen');
  });

  // ---- DECK VIEW ----
  function openDeckModal() {
    const container = document.getElementById('deck-modal-cards');
    container.innerHTML = '';
    for (const card of state.deck) {
      container.appendChild(renderCard(card));
    }
    showModal('deck-modal');
  }

  document.getElementById('btn-deck-view').addEventListener('click', openDeckModal);

  // Combat HUD buttons
  document.getElementById('btn-combat-deck').addEventListener('click', openDeckModal);
  document.getElementById('btn-combat-map').addEventListener('click', () => {
    // Only allow returning to map outside of active combat (safety — disabled during fight)
  });

  document.getElementById('btn-close-deck').addEventListener('click', () => {
    hideModal('deck-modal');
  });

  // Close modals on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal(modal.id);
    });
  });

  // ---- Admin Bridge ----
  // Expose data and functions for admin.js
  window._gameCharacters = CHARACTERS;
  window._gameCards = CARDS;
  window.showScreen = showScreen;

  // Merge admin config on boot
  function mergeAdminConfig() {
    try {
      const config = JSON.parse(localStorage.getItem('gameConfig'));
      if (!config) return;

      // Merge custom characters
      if (config.characters) {
        for (const [id, char] of Object.entries(config.characters)) {
          if (!CHARACTERS[id]) {
            CHARACTERS[id] = {
              id: char.id,
              name: char.name,
              emoji: char.emoji || '👤',
              battleEmoji: char.battleEmoji || char.emoji || '👊',
              role: char.role || 'Custom',
              hp: char.hp || 80,
              description: char.description || 'Custom character',
              starterDeck: char.starterDeck || ['strike','strike','strike','strike','strike','defend','defend','defend','defend'],
              _adminAnimations: char.animations || {},
              _adminSpriteKeys: char.spriteKeys || [],
            };
          } else {
            // Override existing character sprites/animations if set
            if (char.animations) CHARACTERS[id]._adminAnimations = char.animations;
            if (char.spriteKeys && char.spriteKeys.length) CHARACTERS[id]._adminSpriteKeys = char.spriteKeys;
            if (char.emoji) CHARACTERS[id].emoji = char.emoji;
            if (char.hp) CHARACTERS[id].hp = char.hp;
            if (char.role) CHARACTERS[id].role = char.role;
          }
        }
      }

      // Merge custom cards
      if (config.cards) {
        for (const [id, card] of Object.entries(config.cards)) {
          if (!CARDS[id]) {
            CARDS[id] = {
              id: card.id,
              name: card.name,
              cost: card.cost || 1,
              type: card.type || 'attack',
              icon: card.icon || '⚔️',
              desc: card.desc || '',
              effect: card.effect || {},
            };
          }
        }
      }
    } catch (e) {
      console.warn('Admin config merge failed:', e);
    }
  }

  mergeAdminConfig();

  // Admin test battle: start combat with a specific character against floor 1 enemy
  window._adminStartTestBattle = function (charId) {
    const char = CHARACTERS[charId];
    if (!char) return alert('Personagem não encontrado: ' + charId);

    state.character = char;
    state.maxHp = char.hp;
    state.hp = char.hp;
    state.gold = 99;
    state.floor = 0;
    state.deck = (char.starterDeck || ['strike','strike','strike','strike','strike','defend','defend','defend','defend'])
      .map(id => makeCardInstance(id));
    state.buffs = { strength: 0, dexterity: 0, autoBlock: 0 };
    state.floorsCleared = 0;
    state.enemiesKilled = 0;
    state.cardsPlayed = 0;
    state.visitedNodes = new Set();
    state.currentNode = null;
    uidCounter = state.deck.length + 1;

    const enemies = [spawnEnemy(pick(FLOOR_ENEMIES[0]))];
    startCombat(enemies);
  };

  // Admin test scenario: swap battle background
  window._adminTestScenario = function (scenarioData) {
    const video = document.getElementById('battle-bg-video');
    const overlay = document.querySelector('#combat-screen > div[style*="rgba(0,0,0"]');

    if (scenarioData.type === 'video') {
      video.style.display = '';
      video.style.opacity = scenarioData.opacity;
      video.querySelector('source').src = scenarioData.url;
      video.load();
      video.play();
    } else {
      // Replace video with image
      video.style.display = 'none';
      let img = document.getElementById('battle-bg-img');
      if (!img) {
        img = document.createElement('img');
        img.id = 'battle-bg-img';
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;';
        video.parentElement.insertBefore(img, video);
      }
      img.style.display = '';
      img.style.opacity = scenarioData.opacity;
      img.src = scenarioData.url;
    }

    if (overlay) {
      overlay.style.background = `rgba(0,0,0,${scenarioData.overlay})`;
    }

    // Start a test battle if not already in combat
    if (!state.character) {
      const firstChar = Object.keys(CHARACTERS)[0];
      window._adminStartTestBattle(firstChar);
    } else {
      showScreen('combat-screen');
    }
  };

})();
