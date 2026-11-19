// Client (home buyer) generation, dialogue and evaluation.
// A client is built around a real "anchor" listing so every round is solvable.
(function (HH) {
  "use strict";

  const FIRST = {
    f: ["Maya", "Sofia", "Aisha", "Emily", "Priya", "Grace", "Lucia", "Hannah", "Mei", "Zoe", "Fatima", "Chloe", "Imani", "Rosa", "Nora", "Yuki", "Ava", "Leah", "Camila", "Tara", "Brooke", "Ingrid", "Keiko", "Dani"],
    m: ["Jordan", "Marcus", "Diego", "Ethan", "Raj", "Sam", "Omar", "Ben", "Kenji", "Luis", "Tyler", "Andre", "Noah", "Felix", "Hiro", "Malik", "Owen", "Gabe", "Arjun", "Theo", "Caleb", "Dev", "Isaac", "Mateo"],
  };
  const SENIOR = { f: ["Linda", "Barbara", "Carol", "Margaret", "Gloria", "Joan", "Patricia", "Diane"], m: ["Dave", "Frank", "Walter", "Gary", "Ron", "Harold", "Larry", "Bill"] };
  const KIDS = ["Lily", "Max", "Ella", "Leo", "Mia", "Sam", "Ruby", "Finn", "Ivy", "Eli", "June", "Kai"];
  const LAST = ["Okafor", "Martinez", "Chen", "Patel", "Johnson", "Nguyen", "Kim", "Rivera", "Thompson", "Haddad", "Schmidt", "Garcia", "Williams", "Tanaka", "Brooks", "Kowalski", "Singh", "O'Brien", "Rossi", "Mendoza", "Park", "Washington", "Larsen", "Abara", "Delgado", "Hughes", "Novak", "Reyes", "Bennett", "Cohen"];
  const DOGS = ["Biscuit", "Waffles", "Moose", "Bear", "Pickles", "Rosie", "Tank", "Luna", "Gizmo", "Duke", "Pepper", "Ziggy"];
  const CATS = ["Mochi", "Noodle", "Olive", "Mr. Whiskers", "Pumpkin", "Salem"];

  const TOPICS = [
    { key: "household", q: "Who will be living in the home?", icon: "👨‍👩‍👧" },
    { key: "work", q: "What do you do for work?", icon: "💼" },
    { key: "lifestyle", q: "What do you love to do for fun?", icon: "🎨" },
    { key: "dealbreakers", q: "Is there anything that's an absolute dealbreaker?", icon: "🚫" },
    { key: "budget", q: "How firm is that budget?", icon: "💰" },
    { key: "timeline", q: "What's your timeline for moving?", icon: "📅" },
    { key: "condition", q: "How do you feel about fixer-uppers?", icon: "🔨" },
    { key: "style", q: "Do you have a style of home in mind?", icon: "🏛️" },
  ];
  HH.TOPICS = TOPICS;

  const DIFF = {
    easy: { hidden: 0, questions: 99, comps: 0, maxValid: 14, minValid: 3, head: [1.06, 1.15], threshold: 55, hintP: 1 },
    normal: { hidden: 2, questions: 3, comps: 1, maxValid: 8, minValid: 2, head: [1.02, 1.1], threshold: 62, hintP: 0.75 },
    hard: { hidden: 4, questions: 3, comps: 2, maxValid: 4, minValid: 1, head: [1.0, 1.05], threshold: 66, hintP: 0.45 },
  };
  HH.DIFF = DIFF;

  // ---------- requirement catalog ----------
  // test(L) must be pure. say = how the client states it; pro/con = showing reactions.
  const CAT = {
    fenced: { label: "Fenced yard", test: (L) => L.type !== "condo" && L.f.fenced, topic: "household", say: "We need a fenced yard.", pro: "A fenced yard — perfect.", con: "No fenced yard? That doesn't work for us." },
    pool: { label: "Pool", test: (L) => L.f.pool, topic: "lifestyle", say: "We really want a pool.", pro: "A POOL! Cannonball!", con: "No pool..." },
    noPool: { label: "No pool (safety)", test: (L) => !L.f.pool, topic: "household", say: "No pools, please. It's a safety thing for us.", pro: null, con: "A pool? With our little ones? Absolutely not." },
    office: { label: "Home office", test: (L) => L.f.office, topic: "work", say: "I need a real home office — a door that closes.", pro: "Look at this office! I could actually focus here.", con: "Where would I work? The kitchen table again?" },
    garage2: { label: "2+ car garage", test: (L) => L.garage >= 2 && !L.carport && L.type !== "condo", topic: "lifestyle", say: "We need at least a two-car garage.", pro: "Two-car garage. Love it.", con: "The garage is too small for us." },
    garage: { label: "Garage parking", test: (L) => L.garage >= 1 && !L.carport && !/surface|Street|Driveway/.test(L.garageType), topic: "lifestyle", say: "We need a garage.", pro: "Garage parking — nice.", con: "No garage? Hmm." },
    singleStory: { label: "Single-level living (no stairs)", test: (L) => L.stories === 1 && (L.type !== "condo" || L.unitFloor <= 1 || L.f.elevator), topic: "household", say: "It has to be single-level. No stairs.", pro: "No stairs anywhere — wonderful.", con: "All these stairs... that's a dealbreaker." },
    primaryMain: { label: "Bedroom & bath on the main floor", test: (L) => L.f.primaryMain && (L.type !== "condo" || L.unitFloor <= 1 || L.f.elevator), topic: "household", say: "We need a bedroom and bath on the main floor.", pro: "Bedroom on the main floor — that's exactly what we needed.", con: "All the bedrooms are upstairs. That won't work." },
    adu: { label: "In-law suite / ADU", test: (L) => L.f.adu, topic: "household", say: "We need an in-law suite or separate guest unit.", pro: "This guest suite is perfect!", con: "There's nowhere for family to have their own space." },
    basement: { label: "Basement", test: (L) => L.basement > 0, topic: "lifestyle", say: "We'd love a basement.", pro: "A basement! So much storage.", con: "No basement..." },
    workshop: { label: "Workshop space", test: (L) => L.f.workshop, topic: "lifestyle", say: "I need a workshop.", pro: "This workshop is fantastic.", con: "There's no workshop space." },
    solar: { label: "Solar panels", test: (L) => L.f.solar, topic: "lifestyle", say: "Solar panels are a must.", pro: "Solar panels! Our electric bill thanks you.", con: "No solar..." },
    ev: { label: "EV charger", test: (L) => L.f.ev, topic: "lifestyle", say: "We need an EV charger for our electric car.", pro: "An EV charger, already installed!", con: "Where do I charge my car?" },
    fireplace: { label: "Fireplace", test: (L) => L.f.fireplace, topic: "style", say: "A fireplace would make it feel like home.", pro: "A fireplace! I can picture the holidays already.", con: null },
    noCarpet: { label: "No carpet (allergies)", test: (L) => !L.f.carpet, topic: "household", say: "No carpet anywhere — severe allergies.", pro: "No carpet. My sinuses approve.", con: "*sneeze* ...there's carpet. I'm already itchy." },
    kitchen: { label: "Updated kitchen", test: (L) => L.f.kitchen, topic: "style", say: "The kitchen has to be updated. We cook a lot.", pro: "This kitchen is gorgeous.", con: "This kitchen is straight out of a time capsule." },
    view: { label: "A view", test: (L) => L.f.view, topic: "lifestyle", say: "We want a view.", pro: "Look at that view!", con: null },
    waterfront: { label: "Waterfront", test: (L) => L.f.waterfront, topic: "lifestyle", say: "Waterfront would be a dream.", pro: "Right on the water!", con: null },
    nearWater: { label: "Near the water (within ~400 m)", test: (L) => L.loc.waterM < 400, topic: "lifestyle", say: "We need to be close to the water.", pro: "The water's right there!", con: "We're nowhere near the water." },
    walkable: { label: "Walkable (Walk Score 70+)", test: (L) => L.walk >= 70, topic: "lifestyle", say: "I want to walk to coffee, restaurants, everything.", pro: "I can walk to coffee from here!", con: "I'd have to drive everywhere from here." },
    nearPark: { label: "Near a park", test: (L) => L.loc.nearPark, topic: "lifestyle", say: "Being near a park matters to us.", pro: "There's a park right down the street!", con: "No park nearby..." },
    transit: { label: "Near transit", test: (L) => L.loc.transit, topic: "work", say: "I need to be near public transit.", pro: "Transit stop around the corner — great.", con: "How would I get to work without a transit stop?" },
    quiet: { label: "Quiet location (no busy road, highway or rail)", test: (L) => L.loc.quiet, topic: "dealbreakers", say: "It has to be quiet. No busy roads, no highways, no trains.", pro: "It's so peaceful here.", con: "Listen to that traffic... I'd never sleep." },
    notBusy: { label: "Not on a busy street", test: (L) => !L.loc.busy, topic: "dealbreakers", say: "Not on a busy street, please.", pro: "Nice quiet street.", con: "This street is way too busy." },
    noHOA: { label: "No HOA", test: (L) => L.hoa === 0, topic: "dealbreakers", say: "No HOA. Ever. I've had enough of those.", pro: "No HOA! Freedom!", con: "There's an HOA. Hard pass." },
    noFlood: { label: "Not in a flood zone", test: (L) => !L.flood, topic: "dealbreakers", say: "It can't be in a flood zone. Our insurance agent was very clear.", pro: null, con: "It's in a flood zone — our insurance would be a nightmare." },
    moveIn: { label: "Move-in ready (no major repairs)", test: (L) => L.condition >= 2 && !L.issues.major && !L.issues.asIs, topic: "condition", say: "We are NOT handy. It needs to be move-in ready, no major repairs.", pro: "We could move in tomorrow!", con: "Look at the disclosures... this needs major work. We can't do that." },
    project: { label: "A fixer-upper project", test: (L) => L.condition <= 1, topic: "condition", say: "Honestly? We'd love a fixer-upper. We're handy.", pro: "Ooh, look at the potential here!", con: "It's almost too perfect... where's the fun?" },
    dogOK: { label: "Big dogs allowed", test: (L) => L.bigDogOK, topic: "household", say: "Our dog is big, so no pet restrictions.", pro: null, con: "The pet rules here won't allow our dog." },
    petsOK: { label: "Pets allowed", test: (L) => L.pets !== "No pets", topic: "household", say: "We have a cat, so pets have to be allowed.", pro: null, con: "No pets allowed? We're not leaving our cat behind." },
    quickClose: { label: "Can close within 30 days", test: (L) => L.closeDays <= 30, topic: "timeline", say: "We have to close within 30 days. No tenant situations.", pro: "And we can move in right away!", con: "We can't wait that long to move in." },
    rentalOK: { label: "Rentals allowed (no HOA rental ban)", test: (L) => !L.noRentals, topic: "dealbreakers", say: "I need to be able to rent it out, so no HOA rental bans.", pro: null, con: "The HOA bans rentals. That kills the whole plan." },
    garden: { label: "Room to garden", test: (L) => L.f.garden || L.lotAcres >= 0.3, topic: "lifestyle", say: "I need room for a real garden.", pro: "Look at all this room for a garden!", con: "Where would I garden? There's no space." },
    rv: { label: "RV / boat parking", test: (L) => L.f.rv, topic: "lifestyle", say: "We need RV or boat parking.", pro: "Boat parking — yes!", con: "Where would we park the boat?" },
    hotTub: { label: "Hot tub", test: (L) => L.f.hotTub, topic: "lifestyle", say: "A hot tub would be amazing.", pro: "A hot tub!", con: null },
    deck: { label: "Deck, patio or balcony", test: (L) => L.f.deck, topic: "lifestyle", say: "We want outdoor space — a deck or patio.", pro: "Love this outdoor space.", con: null },
    porch: { label: "Screened porch", test: (L) => L.f.porch, topic: "style", say: "A screened porch would be lovely.", pro: "A screened porch! Sweet tea time.", con: null },
    golf: { label: "On a golf course", test: (L) => L.f.golf, topic: "lifestyle", say: "Living on a golf course would be heaven.", pro: "Right on the course!", con: null },
    gym: { label: "Gym (home or building)", test: (L) => !!L.f.gym || L.extras.indexOf("gym") >= 0, topic: "lifestyle", say: "I'd love a gym on site.", pro: "There's a gym!", con: null },
    ac: { label: "Air conditioning", test: (L) => L.f.ac, topic: "dealbreakers", say: "It must have air conditioning.", pro: null, con: "No AC? Not after the last heat wave." },
    smallLot: { label: "Low-maintenance yard", test: (L) => L.lotAcres <= 0.2, topic: "lifestyle", say: "We're done mowing big lawns. Small yard, please.", pro: "Tiny yard — no more weekends mowing!", con: "That's way too much yard to take care of." },
    newerHome: { label: "Built 2000 or newer", test: (L) => L.yearBuilt >= 2000, topic: "style", say: "We want something newer — 2000 or later.", pro: "Nice and modern.", con: "This place is older than we wanted." },
  };

  function param(key, n, extra) {
    switch (key) {
      case "schools": return { key, label: `School rating ${n}+`, test: (L) => L.schoolRating >= n, topic: "household", say: `The schools need to be rated ${n} or higher.`, pro: "Great schools — the kids will thrive here.", con: `The schools here aren't good enough (we need ${n}+).` };
      case "lot": return { key, label: `Lot of ${n}+ acres`, test: (L) => L.lotAcres >= n, topic: "lifestyle", say: `We want a big lot — at least ${n} acres.`, pro: "So much land!", con: "The lot is too small." };
      case "hoaMax": return { key, label: `HOA under $${n}/mo`, test: (L) => L.hoa <= n, topic: "budget", say: `Any HOA fee has to be under $${n} a month.`, pro: null, con: `That HOA fee is way over $${n} a month.` };
      case "older": return { key, label: `Built before ${n} (character!)`, test: (L) => L.yearBuilt < n, topic: "style", say: `I want character — something built before ${n}.`, pro: "Look at the original details!", con: "It has no character at all." };
      case "monthly": return { key, label: `All-in monthly cost under ${HH.money(n)}`, test: (L) => L.monthly <= n, topic: "budget", say: `The real limit is monthly: mortgage, taxes, insurance and HOA must be under ${HH.money(n)} a month.`, pro: null, con: `The monthly payment would be over ${HH.money(n)}. We can't swing that.` };
      case "sqft": return { key, label: `At least ${HH.num(n)} sq ft`, test: (L) => L.sqft >= n, topic: "household", say: `We need at least ${HH.num(n)} square feet.`, pro: "So much space!", con: "It's too small for us." };
      case "baths": return { key, label: `At least ${HH.baths(n)} bathrooms`, test: (L) => L.baths >= n, topic: "household", say: `We need at least ${HH.baths(n)} bathrooms.`, pro: null, con: "Not enough bathrooms — mornings would be chaos." };
      case "extra": { const t = HH.extraText(n); return { key: "extra-" + n, label: `Has a ${t} (check the description!)`, test: (L) => L.extras.indexOf(n) >= 0, topic: extra || "style", say: `It has to have a ${t}.`, pro: `There's the ${t}!`, con: `No ${t}...` }; }
      case "studio": return { key, label: "Studio space (workshop, detached garage, or music room)", test: (L) => L.f.workshop || L.extras.indexOf("musicroom") >= 0 || (L.garage > 0 && /Detached/.test(L.garageType)), topic: "lifestyle", say: "I need studio space — a workshop, a detached garage, or a music room.", pro: "I can already hear the music in this studio space.", con: "There's nowhere to make my art here." };
      case "solarOrEv": return { key, label: "Solar panels or an EV charger", test: (L) => L.f.solar || L.f.ev, topic: "lifestyle", say: "We need solar panels or at least an EV charger.", pro: "Clean energy ready!", con: "No solar, no EV charger..." };
    }
    throw new Error("unknown param req " + key);
  }

  // ---------- people & avatars ----------
  const SKIN = ["#f6d7c3", "#eac0a0", "#d9a27e", "#b97c56", "#8d5a3b", "#5e3b28"];
  const HAIR = ["#2b1d16", "#4a3123", "#7a4a2a", "#b5783f", "#d8b26e", "#1c1c1c", "#8e3b26"];
  const SHIRT = ["#e76f51", "#2a9d8f", "#264653", "#e9c46a", "#8ab17d", "#6d597a", "#b56576", "#457b9d", "#f4a261", "#3d405b", "#c1121f", "#588157"];
  function makePerson(r, gender, age) {
    const senior = age >= 60;
    const hairStyles = gender === "f" ? ["long", "bob", "bun", "curly", "ponytail", "afro", "pixie"] : ["short", "side", "buzz", "curly", "bald", "afro", "quiff"];
    return {
      gender, age,
      name: senior ? r.pick(SENIOR[gender]) : r.pick(FIRST[gender]),
      av: { skin: r.pick(SKIN), hair: senior ? r.pick(["#c9c9c9", "#e0e0e0", "#a9a9a9"]) : r.pick(HAIR), style: r.pick(hairStyles), shirt: r.pick(SHIRT), glasses: r.chance(senior ? 0.6 : 0.25), beard: gender === "m" && r.chance(0.3), seed: r.seed(), age },
    };
  }

  // ---------- archetypes ----------
  // band = anchor price percentile range among active listings.
  const ARCH = [
    {
      id: "firstTime", title: "First-time buyers", w: 1.3, band: [0.02, 0.45],
      people: (r) => ({ adults: 2, age: r.int(25, 34), pets: r.chance(0.35) ? ["cat"] : [] }),
      anchorOk: (L) => L.beds >= 1,
      occupation: ["a teacher", "a nurse", "a barista turned UX designer", "a junior accountant", "a line cook", "a grad student", "a software tester", "a dental hygienist"],
      intro: (c) => [`Hi! I'm ${c.p1}${c.p2 ? `, and this is ${c.p2}` : ""}. We've been renting forever and we're FINALLY ready to buy our first home!`],
      setup(x) {
        x.core({ bedsDrop: 0.4, area: [0.55, 0.3, 0.15] });
        if (x.r.chance(0.6)) x.add("must", "moveIn", { say: "We are NOT handy. I once tried to hang a shelf and it ended with a hole in the wall. Move-in ready, please.", hint: "Fair warning: we've never fixed anything ourselves. Ever." });
        if (x.L.type !== "house" && x.r.chance(0.5)) x.typeAll("A condo or townhome is totally fine for a starter place.");
        if (x.has.cat) x.add("must", "petsOK", { say: `And ${x.petName} the cat comes with us, so pets have to be allowed.` });
        x.comp("monthly", 0.55);
        x.nices(["walkable", "nearPark", "deck", "fireplace", "kitchen", "garage"], 2, 3);
      },
    },
    {
      id: "family", title: "Growing family", w: 1.4, band: [0.25, 0.88],
      people: (r) => ({ adults: 2, age: r.int(31, 44), kids: r.int(2, 3), pets: r.chance(0.4) ? ["dog"] : [] }),
      anchorOk: (L) => L.beds >= 3 && L.baths >= 2 && L.type === "house",
      occupation: ["an engineer", "a physical therapist", "a project manager", "a pharmacist", "a police officer", "an electrician", "a marketing director"],
      intro: (c) => [`Hi there! I'm ${c.p1}, this is ${c.p2}, and somewhere in the waiting room are our ${c.kidCount} kids. We're bursting at the seams in our current place!`],
      setup(x) {
        x.core({ bedsDrop: 0, area: [0.55, 0.3, 0.15], houseOnly: true });
        x.baths(2);
        if (x.L.schoolRating >= 7) x.add("must", x.p("schools", Math.min(x.L.schoolRating, x.r.pick([7, 8, 8, 9]))), { say: "Schools are huge for us. We need a good school zone." });
        if (x.has.dog || x.r.chance(0.5)) x.add("must", "fenced", { say: x.has.dog ? `We need a fenced yard for the kids AND for ${x.petName}, our very energetic dog.` : "The kids need a fenced backyard to run around in." });
        if (x.r.chance(0.6)) x.add("deal", "noPool", { topic: "household", hidden: true, say: `Our youngest, ${x.kid}, is only two and can't swim yet. No pools — that's a hard no.`, hint: `${x.kid} is two and fearless. Terrifyingly fearless.` });
        if (x.r.chance(0.5)) x.add("deal", "notBusy", { say: "We can't be on a busy street with kids playing outside.", hint: "The kids are always chasing balls into the street..." });
        x.nices(["nearPark", "basement", "office", "garage2", "deck", "kitchen"], 2, 3);
      },
    },
    {
      id: "retirees", title: "Empty nesters", w: 1.0, band: [0.2, 0.8],
      people: (r) => ({ adults: 2, age: r.int(61, 72) }),
      anchorOk: (L) => (L.stories === 1 || L.f.primaryMain) && L.beds >= 2,
      occupation: ["a retired high-school principal", "a retired airline pilot", "a semi-retired dentist", "a retired firefighter", "a retired librarian"],
      intro: (c) => [`Hello, dear. I'm ${c.p1}, and this is my husband... sorry, my partner of 38 years, ${c.p2}. The kids are grown and our big house just feels empty now.`],
      setup(x) {
        x.core({ bedsDrop: 0.6, area: [0.6, 0.15, 0.25] });
        const key = x.L.stories === 1 && CAT.singleStory.test(x.L) ? "singleStory" : "primaryMain";
        x.add("must", key, { topic: "household", hidden: x.r.chance(0.6), say: key === "singleStory" ? `${x.p2}'s knees can't handle stairs anymore — it has to be single-level.` : `${x.p2} just had a knee replacement, so we need our bedroom on the main floor.`, hint: `${x.p2} is still recovering from knee surgery, bless them.` });
        x.add("must", "moveIn", { say: "At our age, we don't want any projects. Move-in ready only.", hint: "We've done our share of renovations, thank you very much." });
        if (x.r.chance(0.5)) x.add("must", "quickClose", { say: "We already sold our house, so we need to close within 30 days.", hint: "The movers are already booked..." });
        x.nices(["smallLot", "golf", "nearPark", "porch", "fireplace", "quiet"], 2, 3);
      },
    },
    {
      id: "remote", title: "Remote worker", w: 1.0, band: [0.1, 0.65],
      people: (r) => ({ adults: 1, age: r.int(26, 45), pets: r.chance(0.3) ? [r.pick(["cat", "dog"])] : [] }),
      anchorOk: (L) => L.f.office,
      occupation: ["a remote software developer", "a freelance illustrator", "a data analyst", "a remote customer-success lead", "a podcast producer", "an online tutor"],
      intro: (c) => [`Hey! I'm ${c.p1}. I work from home full-time, and I'm done working from my couch in a one-bedroom apartment.`],
      setup(x) {
        x.core({ bedsDrop: 0.5, area: [0.5, 0, 0.5] });
        x.add("must", "office", { topic: "work", say: "I need a dedicated home office. A real room, with a real door.", hint: "My 'office' right now is a TV tray next to my bed." });
        if (x.r.chance(0.55)) x.add("deal", "quiet", { say: "I'm on video calls all day. It has to be quiet — no busy roads, highways, or train tracks.", hint: "My coworkers can hear the garbage trucks on every call." });
        if (x.has.dog) x.add("must", "dogOK", { say: `${x.petName} is a big boy, so no pet restrictions.` });
        x.nices(["walkable", "deck", "kitchen", "gym", "nearPark"], 2, 3);
      },
    },
    {
      id: "luxury", title: "Executive buyers", w: 0.9, band: [0.82, 1.0],
      people: (r) => ({ adults: 2, age: r.int(40, 56), kids: r.chance(0.4) ? r.int(1, 2) : 0 }),
      anchorOk: (L) => L.type === "house" && L.condition >= 2,
      occupation: ["a hospital CEO", "a tech VP", "a surgeon", "a startup founder", "a corporate attorney", "a professional athlete (retired)"],
      intro: (c) => [`${c.p1} ${c.last}. This is ${c.p2}. We were told you're the best. Let's see if that's true.`],
      setup(x) {
        x.core({ bedsDrop: 0.2, area: [0.6, 0.3, 0.1], houseOnly: true });
        x.add("must", "moveIn", { say: "We don't do projects. Everything must be done." });
        x.add("must", "kitchen", { say: "The kitchen must be updated. We entertain constantly." });
        if (x.L.garage >= 2) x.add("must", "garage2", { say: "At least a two-car garage." });
        if (x.L.f.pool) x.add("must", "pool", { topic: "lifestyle", hidden: x.r.chance(0.5), say: "And a pool. That's not a request.", hint: "Our summers revolve around entertaining outdoors." });
        x.add("deal", "quiet", { topic: "dealbreakers", hidden: x.r.chance(0.5), say: "And absolutely no traffic noise. We paid for peace and quiet.", hint: "I can't stand noise. Ask my last three neighbors." });
        x.nices(["view", "hotTub", "waterfront", "golf", "fireplace", x.extraNice(["theater", "wine", "outdoorkitchen", "sauna"])], 2, 3);
      },
    },
    {
      id: "investor", title: "Real estate investor", w: 0.8, band: [0.0, 0.5], handy: true, value: true,
      people: (r) => ({ adults: 1, age: r.int(33, 60) }),
      anchorOk: (L) => !L.noRentals && L.type !== "condo",
      occupation: ["a full-time landlord", "a house flipper", "an accountant who invests on the side", "a contractor"],
      intro: (c) => [`${c.p1} ${c.last}. I own a few rentals already, and I'm looking for the next one. I care about numbers, not throw pillows.`],
      setup(x) {
        x.core({ bedsDrop: 0.5, area: [0.4, 0, 0.6] });
        x.add("must", "rentalOK", { topic: "dealbreakers", hidden: x.r.chance(0.6), say: "This will be a rental, so no HOA rental bans. That kills the deal instantly.", hint: "I've been burned by HOA rules before." });
        x.typeAll("Any property type works if the numbers work.");
        x.nices(["project", "adu", "basement", "garage"], 2, 3, { project: 9, adu: 9 });
      },
    },
    {
      id: "dogLover", title: "Dog parents", w: 1.0, band: [0.1, 0.75],
      people: (r) => ({ adults: r.chance(0.5) ? 2 : 1, age: r.int(27, 50), pets: ["dog", "dog"] }),
      anchorOk: (L) => L.type !== "condo" && L.f.fenced && L.bigDogOK,
      occupation: ["a veterinarian", "a dog trainer", "a firefighter", "a graphic designer", "a mail carrier"],
      intro: (c) => [`Hi!! I'm ${c.p1}${c.p2 ? `, this is ${c.p2},` : ""} and the real decision-makers are ${c.petName} and ${c.petName2}, our two very large, very loud dogs.`],
      setup(x) {
        x.core({ bedsDrop: 0.6, area: [0.5, 0.2, 0.3] });
        x.add("must", "fenced", { say: `A fenced yard is non-negotiable. ${x.petName} is an escape artist.` });
        x.add("must", "dogOK", { topic: "household", say: "And no pet restrictions — they're 80 pounds each." });
        if (x.r.chance(0.5)) x.add("must", "noCarpet", { topic: "household", hidden: true, say: "Also — no carpet. Two big dogs plus carpet equals a disaster.", hint: "You should see what they did to our rental's carpet..." });
        x.nices(["nearPark", x.extraNice(["dogrun"]), x.p("lot", 0.25), "deck", "garage"], 2, 3);
      },
    },
    {
      id: "multigen", title: "Multigenerational family", w: 0.8, band: [0.3, 0.92],
      people: (r) => ({ adults: 2, age: r.int(36, 50), kids: r.int(1, 3), elder: true }),
      anchorOk: (L) => L.beds >= 4 && (L.f.adu || L.f.primaryMain) && L.type === "house",
      occupation: ["a restaurant owner", "an HVAC contractor", "a high-school coach", "an IT manager", "a midwife"],
      intro: (c) => [`Hello! I'm ${c.p1}, and this is ${c.p2}. We've got kids, and a lot of family. We need room for everyone.`],
      setup(x) {
        x.core({ bedsDrop: 0, area: [0.55, 0.25, 0.2], houseOnly: true, minBeds: 4 });
        const key = x.L.f.adu && x.r.chance(0.5) ? "adu" : "primaryMain";
        x.add("must", key, { topic: "household", hidden: x.r.chance(0.7), say: key === "adu" ? `${x.elder}, my mother, is moving in with us. She needs her own suite — a guest house or in-law unit.` : `${x.elder}, my mother, is moving in. She can't do stairs, so we need a bedroom and bath on the main floor.`, hint: `${x.elder} has been dropping hints about living closer to the grandkids...` });
        x.nices(["kitchen", x.extraNice(["pantry", "mudroom"]), "garage2", "basement", "nearPark"], 2, 3);
        if (x.L.schoolRating >= 7 && x.r.chance(0.5)) x.add("must", x.p("schools", 7), { say: "Decent schools, please — rated 7 or better." });
      },
    },
    {
      id: "creative", title: "Musician / artist", w: 0.8, band: [0.05, 0.6],
      people: (r) => ({ adults: r.chance(0.4) ? 2 : 1, age: r.int(26, 48), pets: r.chance(0.4) ? ["cat"] : [] }),
      anchorOk: (L) => L.type === "house" && (L.f.workshop || L.extras.indexOf("musicroom") >= 0 || (L.garage > 0 && /Detached/.test(L.garageType))),
      occupation: ["a session drummer", "a ceramic artist", "a tattoo artist", "a woodworker", "a music teacher", "a painter"],
      intro: (c) => [`Hey hey. ${c.p1}. I'm ${c.job}. I need a place where I can actually create.`],
      setup(x) {
        x.core({ bedsDrop: 0.6, area: [0.6, 0, 0.4] });
        x.add("must", x.p("studio"), { topic: "lifestyle", say: "I need studio space — a workshop, a detached garage, or a music room." });
        if (x.L.hoa === 0) x.add("deal", "noHOA", { topic: "dealbreakers", hidden: x.r.chance(0.6), say: "And NO HOA. My last one fined me for 'excessive drumming.' Twice.", hint: "Let's just say I've had some run-ins with neighborhood associations..." });
        if (x.has.cat) x.add("must", "petsOK", { say: `${x.petName} is coming with me, obviously.` });
        x.nices([x.p("older", 1960), "walkable", "porch", "hardwoodNice", "nearPark"], 2, 3);
      },
    },
    {
      id: "urbanite", title: "City lover", w: 1.0, band: [0.0, 0.55],
      people: (r) => ({ adults: 1, age: r.int(24, 36), pets: r.chance(0.45) ? ["cat"] : [] }),
      anchorOk: (L) => L.walk >= 70,
      occupation: ["a sous-chef", "a junior architect", "a nurse", "a startup marketer", "a law clerk", "a bartender who's saving like crazy"],
      intro: (c) => [`Hi! I'm ${c.p1}. I don't own a car and I never want to. I want to be where the action is.`],
      setup(x) {
        x.core({ bedsDrop: 0.7, area: [0.6, 0.2, 0.2] });
        x.typeAll("Condo, townhome, house — whatever. Location is everything.");
        x.add("must", "walkable", { say: "It has to be super walkable. Coffee, tacos, bars — all within walking distance." });
        if (x.has.cat) x.add("must", "petsOK", { topic: "household", hidden: true, say: `Oh! And ${x.petName} — my cat — has to be allowed. Some condos ban pets.`, hint: "Sorry, there's cat hair on my jacket." });
        x.nices(["transit", "gym", "view", "deck", "kitchen"], 2, 3);
      },
    },
    {
      id: "diy", title: "DIY renovators", w: 0.8, band: [0.0, 0.5], handy: true, value: true,
      people: (r) => ({ adults: 2, age: r.int(28, 45) }),
      anchorOk: (L) => L.condition <= 1 && L.type === "house",
      occupation: ["a carpenter", "an interior designer", "a home-improvement YouTuber", "a welder", "a contractor"],
      intro: (c) => [`Hi! ${c.p1} and ${c.p2} here. We've watched every renovation show ever made. Now we want our own project!`],
      setup(x) {
        x.core({ bedsDrop: 0.5, area: [0.5, 0, 0.5], houseOnly: true });
        x.add("nice", "project", { w: 12, topic: "condition", hidden: x.diff !== "easy" && x.r.chance(0.5), say: "We actually WANT a fixer-upper. More work means a better price.", hint: "We own more power tools than furniture." });
        x.nices(["workshop", "garage2", x.p("lot", 0.25), "basement"], 2, 3);
      },
    },
    {
      id: "eco", title: "Eco-minded buyers", w: 0.7, band: [0.15, 0.85],
      people: (r) => ({ adults: 2, age: r.int(29, 50), kids: r.chance(0.3) ? 1 : 0 }),
      anchorOk: (L) => L.f.solar || L.f.ev,
      occupation: ["a climate scientist", "an environmental lawyer", "a bike mechanic", "a sustainability consultant", "an organic farmer"],
      intro: (c) => [`Hello! I'm ${c.p1}, and this is ${c.p2}. We're trying to live as green as possible.`],
      setup(x) {
        x.core({ bedsDrop: 0.4, area: [0.5, 0.25, 0.25] });
        x.add("must", x.p("solarOrEv"), { topic: "lifestyle", hidden: x.r.chance(0.5), say: "We need solar panels or at least an EV charger.", hint: "We drive an electric car, and our dream is to power it with sunshine." });
        x.nices(["walkable", "transit", "garden", "newerHome", "nearPark"], 2, 3);
      },
    },
    {
      id: "relocator", title: "Relocating professional", w: 1.0, band: [0.15, 0.8],
      people: (r) => ({ adults: r.chance(0.5) ? 2 : 1, age: r.int(28, 50), kids: r.chance(0.3) ? 1 : 0 }),
      anchorOk: () => true,
      occupation: ["an ER doctor", "a travel nurse", "a university professor", "an air-traffic controller", "a pilot"],
      intro: (c) => [`Hi, I'm ${c.p1}. I just took a new job in town and I'm moving from out of state. I don't know the area at all — that's why I need you.`],
      setup(x) {
        x.core({ bedsDrop: 0.4, area: [0.15, 0.85, 0], commuteHidden: x.r.chance(0.6) });
        if (x.L.closeDays <= 30) x.add("must", "quickClose", { topic: "timeline", hidden: x.r.chance(0.6), say: "I start the new job in three weeks. I need to close within 30 days — no tenant-occupied places.", hint: "Things are moving really fast with this job..." });
        if (x.r.chance(0.4)) x.add("deal", "quiet", { topic: "work", hidden: true, say: "I work night shifts, so I sleep during the day. It HAS to be quiet: no busy roads, highways or trains.", hint: "I'm a bit of a night owl, for work reasons." });
        x.nices(["moveIn", "garage", "nearPark", "kitchen"], 2, 3);
      },
    },
    {
      id: "waterLover", title: "Water lovers", w: 0.9, band: [0.1, 0.95], needs: (m) => m.listings.filter((l) => l.loc.waterM < 400 && l.status === "active").length >= 6,
      people: (r) => ({ adults: 2, age: r.int(30, 62) }),
      anchorOk: (L) => L.loc.waterM < 400,
      occupation: ["a marine biologist", "a sailing instructor", "a fishing guide", "a kayak-shop owner", "a lifeguard captain"],
      intro: (c) => [`Ahoy! Sorry, I always say that. I'm ${c.p1} and this is ${c.p2}. We basically live on the water.`],
      setup(x) {
        x.core({ bedsDrop: 0.6, area: [0.3, 0, 0.7] });
        x.add("must", "nearWater", { say: "We need to be close to the water — walking distance." });
        if (!x.L.flood) x.add("deal", "noFlood", { topic: "dealbreakers", hidden: x.r.chance(0.7), say: "Near the water, but NOT in a flood zone. We've been flooded before. Never again.", hint: "We learned some hard lessons during the last big storm." });
        x.nices(["waterfront", "rv", "deck", "view", "pool"], 2, 3);
      },
    },
  ];
  // extra catalog entries used by archetypes
  CAT.hardwoodNice = { label: "Hardwood floors", test: (L) => L.f.hardwood, topic: "style", say: "Original hardwood floors would be perfect.", pro: "Look at these hardwood floors!", con: null };

  // generic complications for normal/hard
  const COMPS = [
    { key: "monthly", topic: "budget" },
    { key: "quickClose", topic: "timeline" },
    { key: "noFlood", topic: "dealbreakers" },
    { key: "noHOA", topic: "dealbreakers" },
    { key: "quiet", topic: "dealbreakers" },
    { key: "noCarpet", topic: "household" },
    { key: "partner", topic: "style" },
    { key: "acSeattle", topic: "dealbreakers" },
    { key: "extraMust", topic: "style" },
    { key: "hoaMax", topic: "budget" },
  ];

  // ---------- builder context ----------
  function makeCtx(market, r, diff, arch, L, client) {
    const used = new Set();
    const x = {
      r, L, market, diff, arch, client, city: market.city,
      has: { cat: client.pets.some((p) => p.type === "cat"), dog: client.pets.some((p) => p.type === "dog") },
      petName: (client.pets[0] || {}).name, petName2: (client.pets[1] || {}).name,
      p1: client.people[0].name, p2: client.people[1] ? client.people[1].name : null,
      kid: client.kids[0] || "the baby", elder: client.elder || "Mom",
      p: (key, n, extra) => param(key, n, extra),
      extraNice: (keys) => {
        const k = r.pick(keys);
        return param("extra", k, "lifestyle");
      },
      add(kind, keyOrObj, o) {
        o = o || {};
        const base = typeof keyOrObj === "string" ? CAT[keyOrObj] : keyOrObj;
        if (!base) return false;
        const key = typeof keyOrObj === "string" ? keyOrObj : keyOrObj.key;
        if (used.has(key)) return false;
        const pass = base.test(L);
        if ((kind === "must" || kind === "deal") && !pass) return false;
        used.add(key);
        const req = Object.assign({}, base, { key, kind, w: o.w || (kind === "nice" ? 6 : 0) });
        ["say", "pro", "con", "hint", "label"].forEach((k) => { if (o[k] !== undefined) req[k] = o[k]; });
        req.topic = o.topic || base.topic || "lifestyle";
        req.hidden = !!o.hidden;
        req.origin = o.origin || "arch";
        client.reqs.push(req);
        return true;
      },
      nices(list, lo, hi, weights) {
        const n = r.int(lo, hi);
        const picks = r.shuffle(list.filter(Boolean)).slice(0, n + 2);
        let added = 0;
        for (const item of picks) {
          if (added >= n) break;
          const key = typeof item === "string" ? item : item.key;
          if (used.has(key)) continue;
          const base = typeof item === "string" ? CAT[item] : item;
          if (!base) continue;
          if (x.add("nice", item, { w: (weights && weights[key]) || r.int(5, 8), hidden: false })) added++;
        }
      },
      typeAll(line) { client.types = ["house", "townhome", "condo"]; client.typeLine = line; },
      baths(n) { if (L.baths >= n) client.minBaths = n; },
      core(o) {
        // bedrooms
        let beds = L.beds;
        if (r.chance(o.bedsDrop || 0) && beds > 1) beds -= 1;
        if (o.minBeds) beds = Math.max(beds, Math.min(o.minBeds, L.beds));
        client.minBeds = beds;
        client.minBaths = L.baths >= 2 && r.chance(0.35) ? 2 : L.baths >= 1.5 && r.chance(0.3) ? 1.5 : 1;
        // property type
        if (o.houseOnly || L.type === "house") client.types = o.houseOnly || r.chance(0.6) ? ["house"] : ["house", "townhome", "condo"];
        else client.types = L.type === "condo" ? ["condo", "townhome"] : ["townhome", "condo", "house"];
        if (client.types.length === 3) client.typeLine = r.pick(["We're open to a house, townhome or condo.", "Any type of home works — house, townhome, condo."]);
        // area mode
        const mode = r.weighted(["hoods", "commute", "any"], o.area || [0.6, 0.25, 0.15]);
        client.areaMode = mode;
        if (mode === "hoods") {
          const others = market.city.hoods.filter((h) => h.id !== L.hoodId);
          const anchorHood = market.city.hoods.find((h) => h.id === L.hoodId);
          const similar = others.filter((h) => Math.abs(h.ppsf - anchorHood.ppsf) / anchorHood.ppsf < 0.45);
          const extra = r.sample(similar.length ? similar : others, r.int(0, Math.min(2, (similar.length || others.length))));
          client.hoods = r.shuffle([L.hoodId].concat(extra.map((h) => h.id)));
        } else if (mode === "commute") {
          const wi = r.int(0, market.city.work.length - 1);
          const mins = L.commute[wi];
          client.commute = { idx: wi, max: Math.max(15, Math.ceil((mins + r.int(2, 8)) / 5) * 5) };
          client.commuteHidden = !!o.commuteHidden && x.diff !== "easy";
        }
      },
      comp(key, chance) {
        if (!r.chance(chance)) return false;
        return addComp(x, key, true);
      },
      used,
    };
    return x;
  }

  function addComp(x, key, hidden) {
    const { L, r } = x;
    const hid = x.diff === "easy" ? false : hidden;
    switch (key) {
      case "monthly": {
        const cap = Math.ceil((L.monthly * r.range(1.02, 1.07)) / 50) * 50;
        return x.add("must", param("monthly", cap), { topic: "budget", hidden: hid, origin: "comp", hint: "Honestly, it's the monthly payment that keeps me up at night." });
      }
      case "quickClose": return x.add("must", "quickClose", { hidden: hid, origin: "comp", say: "Our lease ends in three weeks! We need to close within 30 days — nothing tenant-occupied.", hint: "Our landlord is NOT happy with us right now..." });
      case "noFlood": return x.add("deal", "noFlood", { hidden: hid, origin: "comp", hint: "Our insurance agent gave us quite the lecture." });
      case "noHOA": return x.add("deal", "noHOA", { hidden: hid, origin: "comp", hint: "Our last HOA fined us for a purple front door. Long story." });
      case "quiet": return x.add("deal", "quiet", { hidden: hid, origin: "comp", say: "I'm an extremely light sleeper. It has to be quiet: no busy roads, highways or train tracks.", hint: "I haven't had a good night's sleep in years." });
      case "noCarpet": return x.add("must", "noCarpet", { hidden: hid, origin: "comp", say: "I have terrible dust allergies — no carpet, anywhere.", hint: "*sniffle* Sorry, allergies." });
      case "acSeattle": if (x.city.id !== "seattle" && x.city.id !== "denver") return false;
        return x.add("deal", "ac", { hidden: hid, origin: "comp", say: "After that brutal heat wave? It must have air conditioning.", hint: "I still have nightmares about last summer's heat wave." });
      case "hoaMax": if (!L.hoa) return false;
        return x.add("must", param("hoaMax", Math.ceil((L.hoa + r.int(20, 80)) / 25) * 25), { hidden: hid, origin: "comp", topic: "budget", hint: "We've heard horror stories about HOA fees." });
      case "partner": {
        if (!x.p2 || L.yearBuilt >= 1960 || !L.f.kitchen) return false;
        const a = x.add("must", param("older", 1960), { hidden: hid, origin: "comp", say: `${x.p1} wants an old house with character — built before 1960.`, hint: `${x.p1} and ${x.p2} have... different tastes. You'll see.` });
        const b = x.add("must", "kitchen", { hidden: hid, origin: "comp", topic: "style", say: `...but ${x.p2} refuses to live with an outdated kitchen. So: old house, new kitchen.` });
        return a || b;
      }
      case "extraMust": {
        const opts = L.extras.filter((k) => ["pantry", "mudroom", "clawfoot", "skylights", "gym", "musicroom", "firepit", "outdoorkitchen", "library", "craftroom", "theater", "sauna", "generator"].indexOf(k) >= 0);
        if (!opts.length) return false;
        const k = r.pick(opts);
        return x.add("must", param("extra", k), { hidden: hid, origin: "comp", say: `One quirky thing: we absolutely need a ${HH.extraText(k)}. It's... a whole thing.`, hint: "We have one very specific wish. Ask us about our style!" });
      }
    }
    return false;
  }

  // ---------- validity ----------
  function hardPass(client, L) {
    if (L.status !== "active") return false;
    if (L.price > client.budget.max) return false;
    if (L.beds < client.minBeds || L.baths < client.minBaths) return false;
    if (client.types.indexOf(L.type) < 0) return false;
    if (client.hoods && client.hoods.indexOf(L.hoodId) < 0) return false;
    if (client.commute && L.commute[client.commute.idx] > client.commute.max) return false;
    for (const q of client.reqs) if ((q.kind === "must" || q.kind === "deal") && !q.test(L)) return false;
    return true;
  }
  HH.hardPass = hardPass;

  // ---------- main generator ----------
  HH.generateClient = function (market, seed, diffKey) {
    const D = DIFF[diffKey] || DIFF.normal;
    const r = HH.rng((seed ^ 0xc11e47) >>> 0);
    const active = market.listings.filter((l) => l.status === "active");
    const sorted = active.slice().sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1));
    const pct = (L) => sorted.indexOf(L) / Math.max(1, sorted.length - 1);

    let arch, anchor;
    for (let tries = 0; tries < 30 && !anchor; tries++) {
      const pool = ARCH.filter((a) => !a.needs || a.needs(market));
      arch = r.weighted(pool, pool.map((a) => a.w));
      const cands = active.filter((L) => arch.anchorOk(L) && pct(L) >= arch.band[0] - 0.03 && pct(L) <= arch.band[1] + 0.03);
      if (cands.length) anchor = r.pick(cands);
    }
    if (!anchor) { arch = ARCH[0]; anchor = r.pick(active); }

    // people
    const spec = arch.people(r);
    const last = r.pick(LAST);
    const people = [];
    const g1 = r.chance(0.5) ? "f" : "m";
    people.push(makePerson(r, g1, spec.age));
    if (spec.adults === 2) {
      const g2 = r.chance(0.8) ? (g1 === "f" ? "m" : "f") : g1;
      let p2 = makePerson(r, g2, spec.age + r.int(-3, 3));
      let guard = 0;
      while (p2.name === people[0].name && guard++ < 5) p2 = makePerson(r, g2, spec.age);
      people.push(p2);
    }
    const kids = [];
    for (let i = 0; i < (spec.kids || 0); i++) { let k = r.pick(KIDS); if (kids.indexOf(k) < 0) kids.push(k); }
    const pets = (spec.pets || []).map((t, i) => ({ type: t, name: t === "dog" ? DOGS[(r.int(0, DOGS.length - 1) + i) % DOGS.length] : r.pick(CATS) }));
    if (pets.length === 2 && pets[0].name === pets[1].name) pets[1].name = DOGS[(DOGS.indexOf(pets[0].name) + 3) % DOGS.length];

    const client = {
      seed, archId: arch.id, archTitle: arch.title, diff: diffKey,
      last, people, kids, pets, elder: spec.elder ? r.pick(SENIOR.f) : null,
      job: r.pick(arch.occupation),
      reqs: [], minBeds: 1, minBaths: 1, types: ["house", "townhome", "condo"], hoods: null, commute: null,
      handy: !!arch.handy, value: !!arch.value,
      anchorId: anchor.id,
    };
    client.name = people.length === 2 ? `${people[0].name} & ${people[1].name} ${last}` : `${people[0].name} ${last}`;
    client.shortName = people.length === 2 ? `the ${/(s|x|z|ch|sh)$/.test(last) ? last + "es" : last + "s"}` : people[0].name;
    client.likesWalk = arch.id === "urbanite" || arch.id === "remote";

    const x = makeCtx(market, r, diffKey, arch, anchor, client);
    arch.setup(x);

    // budget
    const head = r.range(D.head[0], D.head[1]);
    client.budget = { max: Math.max(HH.niceRound(anchor.price * head), Math.ceil(anchor.price / 5000) * 5000) };
    if (diffKey !== "easy" && r.chance(0.45)) client.budget.stretch = HH.niceRound(client.budget.max * r.range(1.03, 1.06));

    // complications
    let comps = D.comps === 0 ? 0 : D.comps === 1 ? r.weighted([0, 1], [0.35, 0.65]) : r.int(1, 2);
    const compOrder = r.shuffle(COMPS);
    for (const c of compOrder) {
      if (comps <= 0) break;
      if (addComp(x, c.key, true)) comps--;
    }

    // tighten until the puzzle is focused
    const valid = () => active.filter((L) => hardPass(client, L)).length;
    const tighteners = r.shuffle(["budget", "sqft", "office", "garage", "kitchen", "deck", "fenced", "nearPark", "quiet", "schools", "newer", "baths", "area", "moveIn", "noHOA", "walkable", "fireplace"]);
    let guard = 0;
    while (valid() > D.maxValid && guard < 24) {
      const t = tighteners[guard % tighteners.length];
      guard++;
      const hide = diffKey === "hard" && r.chance(0.35);
      switch (t) {
        case "budget": {
          const nm = HH.niceRound(anchor.price * r.range(1.0, 1.03));
          if (nm < client.budget.max && nm >= anchor.price) { client.budget.max = nm; if (client.budget.stretch) client.budget.stretch = HH.niceRound(nm * 1.04); }
          break;
        }
        case "sqft": {
          const n = Math.floor((anchor.sqft * r.range(0.86, 0.97)) / 100) * 100;
          if (n >= 800) x.add("must", param("sqft", n), { origin: "tight" });
          break;
        }
        case "baths": if (anchor.baths > client.minBaths) client.minBaths = Math.floor(anchor.baths * 2) / 2 >= 2 ? Math.min(anchor.baths, 2.5) : anchor.baths; break;
        case "schools": if (anchor.schoolRating >= 6) x.add("must", param("schools", anchor.schoolRating - (r.chance(0.5) ? 1 : 0)), { origin: "tight", hidden: hide, topic: "household" }); break;
        case "newer": if (anchor.yearBuilt >= 1990) x.add("must", "newerHome", { origin: "tight", hidden: hide }); break;
        case "area":
          if (client.hoods && client.hoods.length > 1) client.hoods = client.hoods.filter((h, i) => h === anchor.hoodId || i !== client.hoods.length - 1);
          else if (!client.hoods && !client.commute) { client.hoods = [anchor.hoodId]; client.areaMode = "hoods"; }
          break;
        case "garage": x.add("must", anchor.garage >= 2 ? "garage2" : "garage", { origin: "tight", hidden: hide }); break;
        default: x.add("must", t, { origin: "tight", hidden: hide }); break;
      }
    }
    // loosen if too strict for this difficulty
    guard = 0;
    while (valid() < D.minValid && guard < 10) {
      guard++;
      const idx = client.reqs.map((q) => q.origin).lastIndexOf("tight");
      const idx2 = idx >= 0 ? idx : client.reqs.map((q) => q.origin).lastIndexOf("comp");
      const archHard = client.reqs.map((q, i) => (q.origin === "arch" && q.kind !== "nice" ? i : -1)).filter((i) => i >= 0);
      if (idx2 >= 0) client.reqs.splice(idx2, 1);
      else if (diffKey === "easy" && archHard.length > 1) client.reqs.splice(archHard[archHard.length - 1], 1);
      else if (client.budget.max < anchor.price * 1.12) client.budget.max = HH.niceRound(client.budget.max * 1.04);
      else break;
    }

    // decide hidden requirements by difficulty
    const hard = client.reqs.filter((q) => q.kind !== "nice" || q.w >= 9);
    if (diffKey === "easy") client.reqs.forEach((q) => (q.hidden = false));
    else {
      let hiddenCount = client.reqs.filter((q) => q.hidden).length;
      const target = D.hidden + (diffKey === "hard" ? r.int(0, 1) : 0);
      // too many hidden -> unhide some (keep comps hidden first)
      const hiddenList = r.shuffle(client.reqs.filter((q) => q.hidden));
      while (hiddenCount > target && hiddenList.length) { hiddenList.pop().hidden = false; hiddenCount--; }
      // too few -> hide some more must/deal reqs
      const canHide = r.shuffle(hard.filter((q) => !q.hidden));
      while (hiddenCount < target && canHide.length) { canHide.pop().hidden = true; hiddenCount++; }
      // nice-to-haves: sometimes hidden behind lifestyle
      client.reqs.forEach((q) => { if (q.kind === "nice" && !q.hidden && r.chance(diffKey === "hard" ? 0.35 : 0.2)) q.hidden = true; });
    }
    if (client.commute && client.commuteHidden && diffKey !== "easy") client.commute.hidden = true;

    client.questions = D.questions;
    client.threshold = D.threshold;
    // make sure the anchor home is a clearly acceptable answer
    const boosters = r.shuffle(["deck", "fireplace", "kitchen", "nearPark", "garage", "hardwoodNice", "view", "porch", "basement", "office"]).filter((k) => CAT[k].test(anchor) && !x.used.has(k));
    let aev = HH.evaluate(client, anchor);
    while (aev.score < client.threshold + 5 && boosters.length) {
      x.add("nice", boosters.pop(), { w: r.int(5, 7), origin: "boost" });
      aev = HH.evaluate(client, anchor);
    }
    if (aev.score < client.threshold + 3) client.threshold = Math.max(45, aev.score - 3);
    client.validCount = valid();
    if (client.people.length === 1) client.reqs.forEach((q) => { ["say", "pro", "con", "hint"].forEach((k) => { if (q[k]) q[k] = HH.voice(client, q[k]); }); });
    buildDialogue(client, market, r, D, x);
    if (client.people.length === 1) {
      client.opening = client.opening.map((t) => HH.voice(client, t));
      client.hintLines = client.hintLines.map((t) => HH.voice(client, t));
      Object.keys(client.answers).forEach((k) => (client.answers[k] = client.answers[k].map((t) => HH.voice(client, t))));
    }
    return client;
  };

  // Single buyers speak in first person.
  HH.voice = function (c, t) {
    if (!t || !c || c.people.length !== 1) return t;
    const B = "\\b";
    const rules = [["our minds", "my mind"], ["our hearts", "my heart"], ["We're homebodies", "I'm a homebody"], ["We are", "I am"], ["we are", "I am"], ["We were", "I was"], ["we were", "I was"], ["We're", "I'm"], ["we're", "I'm"], ["We've", "I've"], ["we've", "I've"], ["We'd", "I'd"], ["we'd", "I'd"], ["We'll", "I'll"], ["we'll", "I'll"], ["We", "I"], ["we", "I"], ["Our", "My"], ["our", "my"], ["ours", "mine"], ["ourselves", "myself"], ["us", "me"]];
    let out = String(t);
    rules.forEach(([a, b]) => { out = out.replace(new RegExp(B + a + B, "g"), b); });
    return out;
  };

  // ---------- dialogue ----------
  function buildDialogue(c, market, r, D, x) {
    const city = market.city;
    const hoodName = (id) => city.hoods.find((h) => h.id === id).name;
    const lines = [];
    const arch = ARCH.find((a) => a.id === c.archId);
    const ctxNames = { p1: c.people[0].name, p2: c.people[1] && c.people[1].name, last: c.last, kidCount: ["zero", "one", "two", "three", "four"][c.kids.length] || c.kids.length, petName: c.pets[0] && c.pets[0].name, petName2: c.pets[1] && c.pets[1].name, job: c.job };
    lines.push(...arch.intro(ctxNames));
    // area
    if (c.hoods) {
      const names = c.hoods.map(hoodName);
      lines.push(names.length === 1 ? `We've got our hearts set on ${names[0]}. It has to be there.` : `We're looking in ${HH.listJoin(names, "or")} — nowhere else.`);
    } else if (c.commute && !c.commute.hidden) {
      lines.push(`Location-wise, anywhere in ${city.name} is fine, as long as the drive to ${city.work[c.commute.idx].name} is ${c.commute.max} minutes or less.`);
    } else {
      lines.push(`We're open to anywhere in ${city.name}.`);
    }
    // size & type
    const bedTxt = c.minBeds === 0 ? "a studio is fine" : `at least ${HH.plural(c.minBeds, "bedroom")}`;
    const typeTxt = c.types.length === 1 && c.types[0] === "house" ? " in a single-family house" : c.types.indexOf("house") < 0 ? ` — a ${HH.listJoin(c.types, "or")}` : "";
    lines.push(`We need ${bedTxt} and ${HH.baths(c.minBaths)}+ bath${c.minBaths === 1 ? "" : "s"}${typeTxt}.` + (c.typeLine ? " " + c.typeLine : ""));
    lines.push(r.pick([`Our budget tops out at ${HH.money(c.budget.max)}.`, `We're pre-approved for up to ${HH.money(c.budget.max)}.`, `The max we can spend is ${HH.money(c.budget.max)}.`]));
    // visible hard reqs
    const vis = c.reqs.filter((q) => !q.hidden && q.kind !== "nice");
    vis.forEach((q) => lines.push(q.say));
    const visNice = c.reqs.filter((q) => !q.hidden && q.kind === "nice");
    if (visNice.length) lines.push(`Nice-to-haves: ${HH.listJoin(visNice.map((q) => q.label.toLowerCase().replace(/ \(.*\)$/, "")))}. Not required, but they'd win us over.`);
    // hints for hidden
    const hiddenTopics = {};
    c.reqs.filter((q) => q.hidden).forEach((q) => { (hiddenTopics[q.topic] = hiddenTopics[q.topic] || []).push(q); });
    if (c.commute && c.commute.hidden) (hiddenTopics.work = hiddenTopics.work || []).push({ commute: true, hint: "I've been told traffic here is no joke." });
    const hintLines = [];
    Object.keys(hiddenTopics).forEach((t) => {
      const q = hiddenTopics[t].find((z) => z.hint);
      if (q && r.chance(D.hintP)) hintLines.push(q.hint);
    });
    lines.push(...hintLines);
    c.hintLines = hintLines.slice();
    lines.push(r.pick(["So... think you can find us a home?", "That's about it! Where do we start?", "No pressure, but we're counting on you!", "So, what do you think? Can you do it?"]));
    c.opening = lines.filter(Boolean);

    // topic answers
    c.answers = {};
    TOPICS.forEach((t) => {
      const hidden = c.reqs.filter((q) => q.hidden && q.topic === t.key);
      const out = hidden.map((q) => q.say);
      if (t.key === "work" && c.commute && c.commute.hidden) out.unshift(`I'm ${c.job} at ${city.work[c.commute.idx].name}, and I refuse to drive more than ${c.commute.max} minutes to get there.`);
      if (t.key === "budget" && c.budget.stretch) out.push(`If it's truly perfect, we could stretch to ${HH.money(c.budget.stretch)}... but we'd rather not.`);
      if (!out.length) out.push(flavor(t.key, c, city, r));
      c.answers[t.key] = out;
    });
  }

  function flavor(topic, c, city, r) {
    const pets = c.pets.length ? ` and ${HH.listJoin(c.pets.map((p) => p.name))} the ${c.pets[0].type}${c.pets.length > 1 ? "s" : ""}` : "";
    switch (topic) {
      case "household": return c.kids.length ? `It's us, the kids — ${HH.listJoin(c.kids)}${pets}. Nothing special to plan around beyond what I told you.` : `Just ${c.people.length === 2 ? "the two of us" : "me"}${pets}. Nothing special to worry about there.`;
      case "work": return `I'm ${c.job}. ${r.pick(["The commute isn't a big deal for me.", "I'm flexible on where we live, work-wise.", "Work won't really affect the search."])}`;
      case "lifestyle": return r.pick(["We're pretty low-key — Netflix, takeout, the occasional hike.", "We like brunch, farmers markets, and naps. Nothing that changes the house.", "Honestly? We're homebodies. What I told you covers it."]);
      case "dealbreakers": return r.pick(["If it checks the boxes I gave you, we're happy.", "Nothing beyond what I already said, I promise.", "Hmm... no, I think you've got everything."]);
      case "budget": return r.pick(["That number is firm. Our lender was very clear.", "Not a dollar more. Seriously.", "It's firm, sorry. We have a strict budget spreadsheet."]);
      case "timeline": return r.pick(["We're flexible — no rush at all.", "Whenever the right place comes along.", "Timing's not an issue for us."]);
      case "condition": return c.handy ? "Bring on the project!" : r.pick(["A little paint is fine; we're not too picky about cosmetics.", "We can live with some quirks."]);
      case "style": return r.pick(["We're not picky about style — it's what's inside that counts.", "Any style works if it feels like home.", "We'll know it when we see it!"]);
    }
    return "Nothing to add!";
  }

  // ---------- evaluation ----------
  HH.evaluate = function (c, L) {
    const out = { id: L.id, fails: [], pros: [], cons: [], checks: [] };
    let pts = 0;
    if (L.status !== "active") out.fails.push({ text: "It's already under contract! We can't even make an offer.", label: "Listing is available (not pending)" });
    // budget
    const b = c.budget;
    if (L.price > b.max) {
      if (b.stretch && L.price <= b.stretch) {
        pts -= 9;
        out.cons.push("It's over our budget... it would be a real stretch.");
        out.checks.push({ label: `Budget ≤ ${HH.money(b.max)}`, ok: "partial", note: "Within the stretch budget" });
      } else {
        out.fails.push({ text: `${HH.money(L.price)}? That's way over our ${HH.money(b.max)} budget!`, label: `Budget ≤ ${HH.money(b.max)}` });
        out.checks.push({ label: `Budget ≤ ${HH.money(b.max)}`, ok: false });
      }
    } else {
      out.checks.push({ label: `Budget ≤ ${HH.money(b.max)}`, ok: true });
      const ratio = L.price / b.max;
      if (ratio < (c.value ? 0.85 : 0.8)) { pts += c.value ? 10 : 7; out.pros.push(c.value ? "At this price, the numbers really work." : "And the price leaves us money for furniture!"); }
      else if (ratio < 0.9) pts += c.value ? 6 : 4;
    }
    // location
    if (c.hoods) {
      const ok = c.hoods.indexOf(L.hoodId) >= 0;
      out.checks.push({ label: "In a preferred neighborhood", ok });
      if (!ok) out.fails.push({ text: `${L.hoodName}? We told you we only want ${HH.listJoin(c.hoods.map((h) => HH.getCity(L.cityId).hoods.find((x) => x.id === h).name), "or")}.`, label: "Preferred neighborhood" });
    }
    if (c.commute) {
      const m = L.commute[c.commute.idx];
      const ok = m <= c.commute.max;
      out.checks.push({ label: `Commute ≤ ${c.commute.max} min`, ok, hidden: c.commute.hidden, topic: "work" });
      if (!ok) out.fails.push({ text: `The drive to work would be ${m} minutes. That's way too long.`, label: "Commute", hidden: c.commute.hidden });
      else if (m <= c.commute.max - 10) { pts += 3; out.pros.push("And my commute would be a breeze!"); }
    }
    // size & type
    const typeOk = c.types.indexOf(L.type) >= 0;
    out.checks.push({ label: "Property type: " + c.types.map((t) => ({ house: "house", townhome: "townhome", condo: "condo" }[t])).join("/"), ok: typeOk });
    if (!typeOk) out.fails.push({ text: `A ${L.type}? We wanted a ${HH.listJoin(c.types, "or")}.` });
    const bedOk = L.beds >= c.minBeds;
    out.checks.push({ label: `${c.minBeds}+ bedrooms`, ok: bedOk });
    if (!bedOk) out.fails.push({ text: `Only ${L.beds === 0 ? "a studio" : HH.plural(L.beds, "bedroom")}? We need ${c.minBeds}.` });
    else pts += Math.min(2, L.beds - c.minBeds) * 2;
    const bathOk = L.baths >= c.minBaths;
    out.checks.push({ label: `${HH.baths(c.minBaths)}+ baths`, ok: bathOk });
    if (!bathOk) out.fails.push({ text: `Only ${HH.baths(L.baths)} bath${L.baths === 1 ? "" : "s"}? Not enough.` });
    // requirements
    for (const q of c.reqs) {
      const ok = q.test(L);
      out.checks.push({ label: q.label, ok, kind: q.kind, hidden: q.hidden, topic: q.topic });
      if (q.kind === "must" || q.kind === "deal") {
        if (!ok) out.fails.push({ text: q.con || `It doesn't have: ${q.label}.`, label: q.label, hidden: q.hidden });
        else if (q.pro && q.kind === "must") out.pros.push(q.pro);
      } else if (q.kind === "nice") {
        if (ok) { pts += q.w; if (q.pro) out.pros.push(q.pro); }
        else if (q.w >= 9 && q.con) { out.cons.push(q.con); }
      }
    }
    // general tastes
    if (c.handy) { if (L.condition <= 1) pts += 4; }
    else {
      pts += [-10, -5, 0, 4][L.condition];
      if (L.condition <= 1) out.cons.push(L.condition === 0 ? "This place needs a LOT of work." : "It needs more work than we expected.");
      else if (L.condition === 3 && !out.pros.length) out.pros.push("Everything is so fresh and clean!");
    }
    if (L.loc.busy && !c.reqs.some((q) => q.key === "quiet" || q.key === "notBusy")) { pts -= 3; out.cons.push("The street is a little noisy."); }
    if (c.likesWalk) pts += (L.walk - 55) / 8;
    if (c.kids.length) pts += (L.schoolRating - 6) * 1.2;
    if (L.f.view && !c.reqs.some((q) => q.key === "view")) pts += 2;
    if (L.newBuild) pts += 2;
    if (L.dom > 90) { /* stale listing: no effect on buyer */ }
    const gut = (HH.hash(c.seed + ":" + L.id) % 9) - 4;
    let score = Math.round(HH.clamp(72 + pts + gut, 5, 99));
    if (out.fails.length) score = Math.max(4, Math.min(score, 46 - 7 * (out.fails.length - 1)));
    out.score = score;
    out.ok = out.fails.length === 0 && score >= c.threshold;
    return out;
  };

  HH.stars = function (score, accepted) {
    if (!accepted) return score >= 45 ? 1 : 0;
    return score >= 90 ? 5 : score >= 82 ? 4 : score >= 73 ? 3 : 2;
  };

  HH.reactionOpener = function (score) {
    if (score >= 90) return ["Oh. My. Gosh.", "Okay, I'm literally getting chills.", "THIS. This is the one I've been dreaming about."];
    if (score >= 78) return ["Ooh, I really like this.", "Now we're talking!", "This is really nice."];
    if (score >= 62) return ["Hmm, it's not bad.", "It's... nice. Let me think.", "There's a lot to like here."];
    if (score >= 45) return ["Hmm. I'm not sure about this one.", "It's okay, I guess.", "This one's a bit of a mixed bag."];
    return ["Oh... no.", "Um. Why are we here?", "I'm going to be honest with you..."];
  };

  // Client picks among presented houses: highest score that is acceptable. Tie -> earliest presented.
  HH.decide = function (c, presented) {
    let best = null;
    presented.forEach((p) => {
      if (!p.ev.ok) return;
      if (!best || p.ev.score > best.ev.score) best = p;
    });
    return best;
  };
})(window.HH);
