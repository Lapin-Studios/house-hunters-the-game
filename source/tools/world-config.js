// World configuration for House Hunters - The Game.
// Each neighborhood is a small real area; tools/build-world.js pulls real house
// footprints from OpenStreetMap inside it so that Street View points at real homes.
// ppsf = typical price per square foot (USD), era = typical year-built range,
// lot = lot size range (acres), school = school rating range (fictional 1-10),
// mix = property-type weights [single-family, townhouse, condo].

module.exports = [
  {
    id: "austin", name: "Austin", state: "TX", tax: 1.9, insure: 1.25,
    blurb: "Live music, breakfast tacos, and a tech boom that never sleeps.",
    work: [
      { name: "Downtown Austin", lat: 30.2672, lng: -97.7431 },
      { name: "The Domain (tech campus)", lat: 30.4021, lng: -97.7253 },
      { name: "UT Austin campus", lat: 30.2849, lng: -97.7341 },
      { name: "Austin-Bergstrom Airport", lat: 30.1975, lng: -97.6664 },
    ],
    hoods: [
      { id: "hydepark", name: "Hyde Park", lat: 30.3060, lng: -97.7290, ppsf: 520, era: [1912, 1955], lot: [0.12, 0.22], school: [7, 9], hoa: 0.05, mix: [0.9, 0.05, 0.05], vibe: "Historic bungalows under giant pecan trees, walkable to coffee shops." },
      { id: "mueller", name: "Mueller", lat: 30.2990, lng: -97.7000, ppsf: 470, era: [2008, 2023], lot: [0.07, 0.14], school: [7, 9], hoa: 0.95, mix: [0.6, 0.3, 0.1], vibe: "Master-planned new urbanism on the old airport: parks, lakes, front porches." },
      { id: "tarrytown", name: "Tarrytown", lat: 30.2960, lng: -97.7660, ppsf: 760, era: [1938, 2021], lot: [0.2, 0.45], school: [8, 10], hoa: 0.05, mix: [1, 0, 0], vibe: "Leafy, prestigious west-side streets near Lake Austin." },
      { id: "travisheights", name: "Travis Heights", lat: 30.2450, lng: -97.7420, ppsf: 610, era: [1925, 2020], lot: [0.15, 0.3], school: [6, 8], hoa: 0.05, mix: [0.9, 0.1, 0], vibe: "Hilly, eclectic, and a short walk to South Congress." },
      { id: "circlec", name: "Circle C Ranch", lat: 30.1930, lng: -97.8820, ppsf: 290, era: [1990, 2012], lot: [0.15, 0.3], school: [8, 10], hoa: 0.98, mix: [1, 0, 0], vibe: "Family suburb with top schools, greenbelts, and a community pool." },
      { id: "dovesprings", name: "Dove Springs", lat: 30.1870, lng: -97.7400, ppsf: 255, era: [1972, 2002], lot: [0.13, 0.2], school: [4, 6], hoa: 0.1, mix: [1, 0, 0], vibe: "One of Austin's last affordable pockets, with parks and quick I-35 access." },
      { id: "windsorpark", name: "Windsor Park", lat: 30.3140, lng: -97.6880, ppsf: 380, era: [1950, 1972], lot: [0.17, 0.25], school: [5, 7], hoa: 0.02, mix: [1, 0, 0], vibe: "Mid-century ranch homes with big yards, close to Mueller." },
      { id: "atxdowntown", name: "Downtown", condo: true, lat: 30.2660, lng: -97.7450, ppsf: 690, era: [2004, 2022], lot: [0, 0], school: [5, 7], hoa: 1, mix: [0, 0, 1], vibe: "High-rise condos above Lady Bird Lake and Sixth Street." },
    ],
  },
  {
    id: "denver", name: "Denver", state: "CO", tax: 0.55, insure: 1.1,
    blurb: "Mile-high views, 300 days of sun, and the Rockies an hour away.",
    work: [
      { name: "Downtown Denver", lat: 39.7470, lng: -104.9930 },
      { name: "Denver Tech Center", lat: 39.6200, lng: -104.8970 },
      { name: "Anschutz Medical Campus", lat: 39.7454, lng: -104.8380 },
      { name: "Denver Int'l Airport", lat: 39.8561, lng: -104.6737 },
    ],
    hoods: [
      { id: "washpark", name: "Washington Park", lat: 39.7000, lng: -104.9800, ppsf: 620, era: [1905, 2020], lot: [0.12, 0.2], school: [7, 9], hoa: 0.03, mix: [0.95, 0.05, 0], vibe: "Brick bungalows and pop-tops beside Denver's favorite park." },
      { id: "highlands", name: "Highlands", lat: 39.7600, lng: -105.0230, ppsf: 560, era: [1895, 2021], lot: [0.1, 0.18], school: [6, 8], hoa: 0.05, mix: [0.7, 0.25, 0.05], vibe: "Victorians and sleek new builds with skyline views and great restaurants." },
      { id: "capitolhill", name: "Capitol Hill", condo: true, lat: 39.7330, lng: -104.9760, ppsf: 470, era: [1920, 2018], lot: [0, 0], school: [5, 7], hoa: 1, mix: [0, 0, 1], vibe: "Vintage brick walk-ups and lofts near Cheesman Park." },
      { id: "parkhill", name: "Park Hill", lat: 39.7480, lng: -104.9180, ppsf: 440, era: [1915, 1958], lot: [0.14, 0.25], school: [6, 8], hoa: 0.02, mix: [1, 0, 0], vibe: "Tree-lined boulevards and Tudor charm east of City Park." },
      { id: "littleton", name: "Littleton", lat: 39.6000, lng: -105.0000, ppsf: 340, era: [1955, 1995], lot: [0.17, 0.35], school: [7, 9], hoa: 0.3, mix: [0.95, 0.05, 0], vibe: "Quiet south-metro suburb with trails along the Platte." },
      { id: "aurora", name: "Aurora", lat: 39.6850, lng: -104.7900, ppsf: 270, era: [1972, 2005], lot: [0.13, 0.22], school: [5, 7], hoa: 0.6, mix: [0.85, 0.15, 0], vibe: "Diverse, budget-friendly suburb with easy airport access." },
    ],
  },
  {
    id: "columbus", name: "Columbus", state: "OH", tax: 1.65, insure: 0.75,
    blurb: "Buckeye pride, a booming job market, and surprisingly affordable homes.",
    work: [
      { name: "Downtown Columbus", lat: 39.9612, lng: -82.9988 },
      { name: "Ohio State University", lat: 40.0067, lng: -83.0305 },
      { name: "Easton business district", lat: 40.0506, lng: -82.9152 },
      { name: "Intel campus (New Albany)", lat: 40.0928, lng: -82.7590 },
    ],
    hoods: [
      { id: "germanvillage", name: "German Village", lat: 39.9470, lng: -82.9950, ppsf: 380, era: [1855, 1925], lot: [0.04, 0.1], school: [5, 7], hoa: 0.02, mix: [0.8, 0.2, 0], vibe: "Brick streets and 1800s cottages with tiny, perfect gardens." },
      { id: "clintonville", name: "Clintonville", lat: 40.0400, lng: -83.0200, ppsf: 280, era: [1918, 1958], lot: [0.12, 0.25], school: [7, 9], hoa: 0.02, mix: [1, 0, 0], vibe: "Friendly, artsy streets near the ravines and Olentangy Trail." },
      { id: "victorianvillage", name: "Victorian Village", lat: 39.9800, lng: -83.0120, ppsf: 330, condo: true, era: [1880, 2018], lot: [0, 0], school: [5, 7], hoa: 0.9, mix: [0.3, 0, 0.7], vibe: "Painted Victorians and condos steps from the Short North arts district." },
      { id: "oldetowneeast", name: "Olde Towne East", lat: 39.9640, lng: -82.9750, ppsf: 210, era: [1880, 1925], lot: [0.1, 0.2], school: [3, 5], hoa: 0.02, mix: [1, 0, 0], vibe: "Grand old homes, some lovingly restored and some begging for it." },
      { id: "merion", name: "Merion Village", lat: 39.9350, lng: -82.9900, ppsf: 250, era: [1900, 1940], lot: [0.08, 0.15], school: [4, 6], hoa: 0.02, mix: [1, 0, 0], vibe: "Cozy brick doubles and cottages just south of German Village." },
      { id: "hilliard", name: "Hilliard", lat: 40.0350, lng: -83.1550, ppsf: 205, era: [1975, 2015], lot: [0.18, 0.35], school: [7, 9], hoa: 0.6, mix: [1, 0, 0], vibe: "Family-friendly west-side suburb with a growing old town." },
      { id: "hilltop", name: "Hilltop", lat: 39.9500, lng: -83.0700, ppsf: 140, era: [1910, 1960], lot: [0.1, 0.2], school: [3, 5], hoa: 0.01, mix: [1, 0, 0], vibe: "The city's best bargains, with plenty of fixer-uppers and big porches." },
    ],
  },
  {
    id: "phoenix", name: "Phoenix", state: "AZ", tax: 0.6, insure: 0.95,
    blurb: "Desert sunsets, backyard pools, and no snow shovel required.",
    work: [
      { name: "Downtown Phoenix", lat: 33.4484, lng: -112.0740 },
      { name: "ASU Tempe campus", lat: 33.4242, lng: -111.9281 },
      { name: "Scottsdale Airpark", lat: 33.6200, lng: -111.9100 },
      { name: "Sky Harbor Airport", lat: 33.4352, lng: -112.0101 },
    ],
    hoods: [
      { id: "arcadia", name: "Arcadia", lat: 33.4980, lng: -111.9720, ppsf: 650, era: [1952, 2021], lot: [0.35, 0.9], school: [8, 10], hoa: 0.02, mix: [1, 0, 0], vibe: "Citrus groves, big lots, and Camelback Mountain views." },
      { id: "mccormick", name: "McCormick Ranch", lat: 33.5550, lng: -111.8950, ppsf: 390, era: [1972, 1995], lot: [0.15, 0.3], school: [7, 9], hoa: 0.9, mix: [0.8, 0.15, 0.05], vibe: "Scottsdale lakes, greenbelts, and resort-style living." },
      { id: "ahwatukee", name: "Ahwatukee", lat: 33.3350, lng: -111.9850, ppsf: 290, era: [1980, 2005], lot: [0.14, 0.25], school: [7, 9], hoa: 0.85, mix: [1, 0, 0], vibe: "Mountain-preserve suburb with golf courses and hiking trails." },
      { id: "chandler", name: "Chandler", lat: 33.2850, lng: -111.8600, ppsf: 275, era: [1990, 2012], lot: [0.14, 0.25], school: [7, 9], hoa: 0.95, mix: [1, 0, 0], vibe: "Tech-corridor suburb with tidy stucco homes and community pools." },
      { id: "maryvale", name: "Maryvale", lat: 33.4950, lng: -112.1800, ppsf: 215, era: [1956, 1978], lot: [0.14, 0.2], school: [3, 6], hoa: 0.02, mix: [1, 0, 0], vibe: "Mid-century block homes at prices first-time buyers can actually afford." },
    ],
  },
  {
    id: "seattle", name: "Seattle", state: "WA", tax: 0.9, insure: 0.8,
    blurb: "Coffee, evergreens, mountain views, and a little bit of rain.",
    work: [
      { name: "Downtown Seattle", lat: 47.6062, lng: -122.3321 },
      { name: "South Lake Union (tech)", lat: 47.6256, lng: -122.3344 },
      { name: "University of Washington", lat: 47.6553, lng: -122.3035 },
      { name: "Bellevue downtown", lat: 47.6101, lng: -122.2015 },
    ],
    hoods: [
      { id: "ballard", name: "Ballard", lat: 47.6780, lng: -122.3800, ppsf: 630, era: [1905, 2021], lot: [0.08, 0.14], school: [7, 9], hoa: 0.05, mix: [0.75, 0.2, 0.05], vibe: "Scandinavian roots, breweries, and Craftsmans near the locks." },
      { id: "wallingford", name: "Wallingford", lat: 47.6580, lng: -122.3350, ppsf: 680, era: [1905, 1940], lot: [0.08, 0.13], school: [8, 10], hoa: 0.02, mix: [0.95, 0.05, 0], vibe: "Classic foursquares, Gas Works Park, and an easy bike to UW." },
      { id: "queenanne", name: "Queen Anne", lat: 47.6380, lng: -122.3620, ppsf: 720, era: [1900, 1950], lot: [0.09, 0.16], school: [8, 10], hoa: 0.05, mix: [0.85, 0.05, 0.1], vibe: "Hilltop elegance with Space Needle and Sound views." },
      { id: "westseattle", name: "West Seattle", lat: 47.5550, lng: -122.3850, ppsf: 560, era: [1915, 2018], lot: [0.11, 0.2], school: [6, 8], hoa: 0.03, mix: [0.9, 0.1, 0], vibe: "Beach-town feel across the bridge, with Alki and Lincoln Park." },
      { id: "caphill", name: "Capitol Hill", condo: true, lat: 47.6200, lng: -122.3180, ppsf: 640, era: [1925, 2020], lot: [0, 0], school: [6, 8], hoa: 1, mix: [0, 0, 1], vibe: "Seattle's liveliest neighborhood: condos, light rail, and late-night everything." },
      { id: "beaconhill", name: "Beacon Hill", lat: 47.5600, lng: -122.3080, ppsf: 520, era: [1910, 1965], lot: [0.1, 0.16], school: [5, 7], hoa: 0.02, mix: [0.95, 0.05, 0], vibe: "Diverse hillside community with light rail and big views." },
    ],
  },
  {
    id: "nashville", name: "Nashville", state: "TN", tax: 0.65, insure: 1.05,
    blurb: "Music City: hot chicken, honky-tonks, and lots of new construction.",
    work: [
      { name: "Downtown Nashville", lat: 36.1627, lng: -86.7816 },
      { name: "Vanderbilt University", lat: 36.1447, lng: -86.8027 },
      { name: "Cool Springs offices", lat: 35.9420, lng: -86.8170 },
      { name: "Nashville Int'l Airport", lat: 36.1263, lng: -86.6774 },
    ],
    hoods: [
      { id: "eastnash", name: "East Nashville", lat: 36.1830, lng: -86.7450, ppsf: 430, era: [1910, 2022], lot: [0.12, 0.25], school: [5, 7], hoa: 0.05, mix: [0.8, 0.2, 0], vibe: "Creative, quirky, and full of renovated cottages and 'tall-and-skinnies'." },
      { id: "12south", name: "12 South", lat: 36.1230, lng: -86.7880, ppsf: 620, era: [1925, 2022], lot: [0.12, 0.22], school: [6, 8], hoa: 0.05, mix: [0.85, 0.15, 0], vibe: "Boutiques, murals, and pricey modern farmhouses." },
      { id: "bellemeade", name: "Belle Meade", lat: 36.1000, lng: -86.8650, ppsf: 560, era: [1925, 2015], lot: [0.6, 1.8], school: [8, 10], hoa: 0.05, mix: [1, 0, 0], vibe: "Old-money estates on huge, rolling lots." },
      { id: "franklin", name: "Franklin", lat: 35.9200, lng: -86.8500, ppsf: 340, era: [1985, 2020], lot: [0.2, 0.45], school: [9, 10], hoa: 0.85, mix: [0.95, 0.05, 0], vibe: "Historic small-town square with some of Tennessee's best schools." },
      { id: "germantown", name: "Germantown", condo: true, lat: 36.1780, lng: -86.7880, ppsf: 520, era: [1880, 2021], lot: [0, 0], school: [5, 7], hoa: 0.95, mix: [0.2, 0.2, 0.6], vibe: "Brick sidewalks, the farmers market, and stylish lofts." },
      { id: "antioch", name: "Antioch", lat: 36.0450, lng: -86.6450, ppsf: 205, era: [1980, 2020], lot: [0.14, 0.25], school: [4, 6], hoa: 0.5, mix: [0.85, 0.15, 0], vibe: "Affordable, fast-growing southeast suburb near the airport." },
    ],
  },
  {
    id: "atlanta", name: "Atlanta", state: "GA", tax: 0.95, insure: 1.0,
    blurb: "The city in a forest: peaches, Beltline strolls, and big trees everywhere.",
    work: [
      { name: "Downtown Atlanta", lat: 33.7490, lng: -84.3880 },
      { name: "Midtown offices", lat: 33.7838, lng: -84.3833 },
      { name: "Hartsfield-Jackson Airport", lat: 33.6407, lng: -84.4277 },
      { name: "Emory University", lat: 33.7925, lng: -84.3240 },
    ],
    hoods: [
      { id: "vahi", name: "Virginia-Highland", lat: 33.7800, lng: -84.3530, ppsf: 470, era: [1915, 1940], lot: [0.14, 0.25], school: [7, 9], hoa: 0.02, mix: [0.95, 0.05, 0], vibe: "Craftsman bungalows near the Beltline and Piedmont Park." },
      { id: "decatur", name: "Decatur", lat: 33.7650, lng: -84.2950, ppsf: 410, era: [1920, 2020], lot: [0.15, 0.3], school: [9, 10], hoa: 0.05, mix: [0.9, 0.1, 0], vibe: "A small town inside the big city, famous for its schools and festivals." },
      { id: "buckhead", name: "Buckhead", lat: 33.8350, lng: -84.3950, ppsf: 500, era: [1930, 2020], lot: [0.4, 1.2], school: [8, 10], hoa: 0.05, mix: [1, 0, 0], vibe: "Grand estates on winding, wooded streets." },
      { id: "marietta", name: "Marietta", lat: 33.9600, lng: -84.5300, ppsf: 240, era: [1950, 2015], lot: [0.2, 0.5], school: [6, 8], hoa: 0.4, mix: [0.95, 0.05, 0], vibe: "Historic square, Kennesaw Mountain, and suburban breathing room." },
      { id: "midtown", name: "Midtown", condo: true, lat: 33.7800, lng: -84.3820, ppsf: 420, era: [1990, 2022], lot: [0, 0], school: [6, 8], hoa: 1, mix: [0, 0, 1], vibe: "Towers and lofts beside Piedmont Park and the Beltline." },
      { id: "eastpoint", name: "East Point", lat: 33.6800, lng: -84.4450, ppsf: 170, era: [1925, 1975], lot: [0.15, 0.3], school: [3, 5], hoa: 0.02, mix: [1, 0, 0], vibe: "Budget-friendly bungalows minutes from the airport." },
    ],
  },
  {
    id: "tampa", name: "Tampa", state: "FL", tax: 1.0, insure: 2.2,
    blurb: "Bay breezes, palm trees, and no state income tax (hello, hurricane season).",
    work: [
      { name: "Downtown Tampa", lat: 27.9506, lng: -82.4572 },
      { name: "Westshore business district", lat: 27.9500, lng: -82.5250 },
      { name: "USF / Moffitt", lat: 28.0587, lng: -82.4139 },
      { name: "Tampa Int'l Airport", lat: 27.9772, lng: -82.5311 },
    ],
    hoods: [
      { id: "palmaceia", name: "Palma Ceia", lat: 27.9250, lng: -82.4950, ppsf: 560, era: [1925, 2020], lot: [0.14, 0.3], school: [8, 10], hoa: 0.03, mix: [0.95, 0.05, 0], vibe: "South Tampa charm near Bayshore Boulevard and the golf club." },
      { id: "seminoleheights", name: "Seminole Heights", lat: 28.0050, lng: -82.4600, ppsf: 340, era: [1915, 1955], lot: [0.12, 0.22], school: [5, 7], hoa: 0.02, mix: [1, 0, 0], vibe: "Historic bungalows, indie restaurants, and the Hillsborough River." },
      { id: "carrollwood", name: "Carrollwood", lat: 28.0500, lng: -82.5050, ppsf: 280, era: [1965, 1995], lot: [0.2, 0.4], school: [6, 8], hoa: 0.5, mix: [0.9, 0.1, 0], vibe: "Lakes, mature oaks, and a laid-back suburban vibe." },
      { id: "townncountry", name: "Town 'n' Country", lat: 28.0100, lng: -82.5800, ppsf: 255, era: [1962, 1990], lot: [0.15, 0.25], school: [5, 7], hoa: 0.2, mix: [1, 0, 0], vibe: "Practical ranch homes close to the airport and Westshore jobs." },
      { id: "brandon", name: "Brandon", lat: 27.9250, lng: -82.3000, ppsf: 230, era: [1975, 2015], lot: [0.15, 0.3], school: [5, 7], hoa: 0.6, mix: [0.9, 0.1, 0], vibe: "Practical, affordable suburb east of the city." },
    ],
  },
];
