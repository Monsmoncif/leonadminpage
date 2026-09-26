export interface CarMake {
  name: string;
  popular?: boolean;
  aliases?: string[];
  models: string[];
}

export const CAR_CATALOG: CarMake[] = [
  {
    name: "Mercedes-Benz",
    popular: true,
    aliases: ["mercedes", "benz", "merc", "amg"],
    models: [
      "A-Class",
      "A-Class Sedan",
      "B-Class",
      "C-Class",
      "C-Class Coupe",
      "C-Class Estate",
      "CLA",
      "CLE",
      "CLS",
      "E-Class",
      "E-Class Coupe",
      "S-Class",
      "S-Class Maybach",
      "GLA",
      "GLB",
      "GLC",
      "GLC Coupe",
      "GLE",
      "GLE Coupe",
      "GLS",
      "GLS Maybach",
      "G-Class (G63 AMG)",
      "EQA",
      "EQB",
      "EQC",
      "EQE",
      "EQE SUV",
      "EQS",
      "EQS SUV",
      "V-Class",
      "Vito",
      "Sprinter",
      "AMG GT",
      "SL Roadster"
    ]
  },
  {
    name: "BMW",
    popular: true,
    aliases: ["bimmer", "bm"],
    models: [
      "1 Series",
      "2 Series Active Tourer",
      "2 Series Gran Coupe",
      "2 Series Coupe",
      "3 Series",
      "3 Series Touring",
      "4 Series Coupe",
      "4 Series Gran Coupe",
      "4 Series Convertible",
      "5 Series",
      "5 Series Touring",
      "6 Series Gran Turismo",
      "7 Series",
      "8 Series",
      "8 Series Gran Coupe",
      "X1",
      "X2",
      "X3",
      "X4",
      "X5",
      "X6",
      "X7",
      "XM",
      "Z4",
      "i4",
      "i5",
      "i7",
      "iX1",
      "iX2",
      "iX3",
      "iX",
      "M2",
      "M3",
      "M4",
      "M5",
      "M8"
    ]
  },
  {
    name: "Audi",
    popular: true,
    aliases: ["audi"],
    models: [
      "A1",
      "A3",
      "A3 Sedan",
      "A4",
      "A4 Avant",
      "A5",
      "A5 Sportback",
      "A6",
      "A6 Avant",
      "A7 Sportback",
      "A8",
      "Q2",
      "Q3",
      "Q3 Sportback",
      "Q4 e-tron",
      "Q4 Sportback e-tron",
      "Q5",
      "Q5 Sportback",
      "Q7",
      "Q8",
      "Q8 e-tron",
      "e-tron GT",
      "TT",
      "R8",
      "S3",
      "S4",
      "S5",
      "RS3",
      "RS4",
      "RS5",
      "RS6 Avant",
      "RS7",
      "RS Q8"
    ]
  },
  {
    name: "Volkswagen",
    popular: true,
    aliases: ["vw", "volks"],
    models: [
      "Golf",
      "Golf 7",
      "Golf 8",
      "Golf GTI",
      "Golf R",
      "Polo",
      "Passat",
      "Passat CC",
      "Arteon",
      "Arteon Shooting Brake",
      "T-Roc",
      "T-Roc Cabriolet",
      "T-Cross",
      "Taigo",
      "Tiguan",
      "Tiguan Allspace",
      "Touareg",
      "Touran",
      "Caddy",
      "Transporter",
      "Caravelle",
      "Multivan",
      "Crafter",
      "ID.3",
      "ID.4",
      "ID.5",
      "ID.7",
      "ID. Buzz",
      "Jetta",
      "Scirocco"
    ]
  },
  {
    name: "Dacia",
    popular: true,
    aliases: ["dacia"],
    models: [
      "Sandero",
      "Sandero Stepway",
      "Logan",
      "Duster",
      "Jogger",
      "Spring",
      "Dokker",
      "Lodgy"
    ]
  },
  {
    name: "Renault",
    popular: true,
    aliases: ["renault"],
    models: [
      "Clio",
      "Clio 4",
      "Clio 5",
      "Megane",
      "Megane Sedan",
      "Megane E-Tech",
      "Captur",
      "Austral",
      "Arkana",
      "Kadjar",
      "Koleos",
      "Rafale",
      "Symbioz",
      "Talisman",
      "Scenic",
      "Scenic E-Tech",
      "Espace",
      "Twingo",
      "Zoe",
      "Express",
      "Kangoo",
      "Trafic",
      "Master"
    ]
  },
  {
    name: "Peugeot",
    popular: true,
    aliases: ["peugeot"],
    models: [
      "208",
      "e-208",
      "308",
      "308 SW",
      "408",
      "508",
      "508 SW",
      "2008",
      "e-2008",
      "3008",
      "5008",
      "Rifter",
      "Partner",
      "Expert",
      "Boxer",
      "Traveller",
      "108",
      "301"
    ]
  },
  {
    name: "Range Rover",
    popular: true,
    aliases: ["land rover", "rangerover", "landrover", "rover"],
    models: [
      "Range Rover",
      "Range Rover Sport",
      "Range Rover Velar",
      "Range Rover Evoque",
      "Defender 90",
      "Defender 110",
      "Defender 130",
      "Discovery",
      "Discovery Sport"
    ]
  },
  {
    name: "Porsche",
    popular: true,
    aliases: ["porsche"],
    models: [
      "911 Carrera",
      "911 Turbo",
      "911 GT3",
      "Cayenne",
      "Cayenne Coupe",
      "Macan",
      "Macan EV",
      "Panamera",
      "Taycan",
      "Taycan Cross Turismo",
      "718 Boxster",
      "718 Cayman"
    ]
  },
  {
    name: "Toyota",
    popular: true,
    aliases: ["toyota"],
    models: [
      "Yaris",
      "Yaris Cross",
      "Corolla",
      "Corolla Cross",
      "Camry",
      "RAV4",
      "Land Cruiser",
      "Land Cruiser Prado",
      "Hilux",
      "C-HR",
      "Fortuner",
      "Highlander",
      "Prius",
      "Supra",
      "GR86",
      "Proace",
      "Hiace",
      "Aygo X"
    ]
  },
  {
    name: "Hyundai",
    popular: true,
    aliases: ["hyundai"],
    models: [
      "i10",
      "i20",
      "i30",
      "Accent",
      "Elantra",
      "Sonata",
      "Tucson",
      "Santa Fe",
      "Palisade",
      "Kona",
      "Creta",
      "Staria",
      "H-1",
      "Ioniq 5",
      "Ioniq 6",
      "Bayon"
    ]
  },
  {
    name: "Kia",
    popular: true,
    aliases: ["kia"],
    models: [
      "Picanto",
      "Rio",
      "Ceed",
      "XCeed",
      "Cerato",
      "K5",
      "K8",
      "Sportage",
      "Sorento",
      "Seltos",
      "Sonet",
      "Carnival",
      "EV6",
      "EV9",
      "Stinger",
      "Niro"
    ]
  },
  {
    name: "Citroën",
    popular: true,
    aliases: ["citroen", "citroën"],
    models: [
      "C3",
      "C3 Aircross",
      "C4",
      "C4 X",
      "C5 Aircross",
      "C5 X",
      "Berlingo",
      "Jumpy",
      "SpaceTourer",
      "Jumper",
      "C-Elysée",
      "Ami"
    ]
  },
  {
    name: "Nissan",
    popular: true,
    aliases: ["nissan"],
    models: [
      "Micra",
      "Sunny",
      "Sentra",
      "Altima",
      "Maxima",
      "Qashqai",
      "X-Trail",
      "Juke",
      "Patrol",
      "Navara",
      "Ariya",
      "Pathfinder",
      "GT-R"
    ]
  },
  {
    name: "Fiat",
    popular: true,
    aliases: ["fiat"],
    models: [
      "500",
      "500X",
      "500e",
      "600",
      "Panda",
      "Tipo",
      "Tipo Sedan",
      "Tipo Cross",
      "Doblo",
      "Ducato",
      "Fiorino",
      "Scudo"
    ]
  },
  {
    name: "Jeep",
    popular: true,
    aliases: ["jeep"],
    models: [
      "Renegade",
      "Compass",
      "Cherokee",
      "Grand Cherokee",
      "Wrangler",
      "Wrangler Rubicon",
      "Gladiator",
      "Avenger"
    ]
  },
  {
    name: "Ford",
    popular: true,
    aliases: ["ford"],
    models: [
      "Fiesta",
      "Focus",
      "Mondeo",
      "Mustang",
      "Mustang Mach-E",
      "Puma",
      "Kuga",
      "Explorer",
      "Edge",
      "Expedition",
      "Ranger",
      "Ranger Raptor",
      "F-150",
      "Transit",
      "Transit Custom",
      "Tourneo"
    ]
  },
  {
    name: "SEAT",
    popular: true,
    aliases: ["seat"],
    models: [
      "Ibiza",
      "Leon",
      "Leon Sportstourer",
      "Arona",
      "Ateca",
      "Tarraco"
    ]
  },
  {
    name: "CUPRA",
    popular: true,
    aliases: ["cupra"],
    models: [
      "Formentor",
      "Leon",
      "Ateca",
      "Born",
      "Tavascan",
      "Terramar"
    ]
  },
  {
    name: "Skoda",
    popular: false,
    aliases: ["skoda", "škoda"],
    models: [
      "Fabia",
      "Scala",
      "Octavia",
      "Superb",
      "Kamiq",
      "Karoq",
      "Kodiaq",
      "Enyaq iV"
    ]
  },
  {
    name: "Volvo",
    popular: false,
    aliases: ["volvo"],
    models: [
      "XC40",
      "XC60",
      "XC90",
      "EX30",
      "EX90",
      "S60",
      "S90",
      "V60",
      "V90"
    ]
  },
  {
    name: "Maserati",
    popular: false,
    aliases: ["maserati"],
    models: [
      "Ghibli",
      "Levante",
      "Quattroporte",
      "Grecale",
      "MC20",
      "GranTurismo"
    ]
  },
  {
    name: "Alfa Romeo",
    popular: false,
    aliases: ["alfa", "romeo"],
    models: [
      "Giulia",
      "Stelvio",
      "Tonale",
      "Junior",
      "Giulietta"
    ]
  },
  {
    name: "Jaguar",
    popular: false,
    aliases: ["jaguar", "jag"],
    models: [
      "F-Pace",
      "E-Pace",
      "I-Pace",
      "XE",
      "XF",
      "F-Type"
    ]
  },
  {
    name: "Mini",
    popular: false,
    aliases: ["mini", "cooper"],
    models: [
      "Cooper",
      "Cooper S",
      "John Cooper Works",
      "Countryman",
      "Clubman",
      "Aceman",
      "Cabrio"
    ]
  },
  {
    name: "Opel",
    popular: false,
    aliases: ["opel"],
    models: [
      "Corsa",
      "Astra",
      "Mokka",
      "Crossland",
      "Grandland",
      "Combo",
      "Vivaro",
      "Zafira"
    ]
  },
  {
    name: "Tesla",
    popular: false,
    aliases: ["tesla"],
    models: [
      "Model 3",
      "Model Y",
      "Model S",
      "Model X",
      "Cybertruck"
    ]
  },
  {
    name: "Ferrari",
    popular: false,
    aliases: ["ferrari"],
    models: [
      "Roma",
      "F8 Tributo",
      "296 GTB",
      "812 Superfast",
      "Purosangue",
      "SF90 Stradale",
      "Portofino"
    ]
  },
  {
    name: "Lamborghini",
    popular: false,
    aliases: ["lamborghini", "lambo"],
    models: [
      "Huracán",
      "Urus",
      "Revuelto",
      "Aventador"
    ]
  },
  {
    name: "Bentley",
    popular: false,
    aliases: ["bentley"],
    models: [
      "Continental GT",
      "Flying Spur",
      "Bentayga"
    ]
  },
  {
    name: "Rolls-Royce",
    popular: false,
    aliases: ["rolls", "royce", "rollsroyce"],
    models: [
      "Ghost",
      "Phantom",
      "Cullinan",
      "Wraith",
      "Dawn",
      "Spectre"
    ]
  },
  {
    name: "Aston Martin",
    popular: false,
    aliases: ["aston", "martin"],
    models: [
      "DBX",
      "Vantage",
      "DB11",
      "DB12",
      "DBS"
    ]
  },
  {
    name: "Chevrolet",
    popular: false,
    aliases: ["chevy", "chevrolet"],
    models: [
      "Spark",
      "Aveo",
      "Malibu",
      "Camaro",
      "Corvette",
      "Tahoe",
      "Suburban",
      "Captiva",
      "Silverado"
    ]
  },
  {
    name: "Suzuki",
    popular: false,
    aliases: ["suzuki"],
    models: [
      "Swift",
      "Dzire",
      "Baleno",
      "Jimny",
      "Vitara",
      "Grand Vitara",
      "Ciaz",
      "S-Cross",
      "Celerio"
    ]
  },
  {
    name: "Mitsubishi",
    popular: false,
    aliases: ["mitsubishi"],
    models: [
      "Mirage",
      "Attrage",
      "Eclipse Cross",
      "Outlander",
      "Pajero",
      "Pajero Sport",
      "L200",
      "ASX"
    ]
  },
  {
    name: "MG",
    popular: false,
    aliases: ["mg", "morris garages"],
    models: [
      "MG 3",
      "MG 4",
      "MG 5",
      "MG 6",
      "MG ZS",
      "MG HS",
      "MG Cyberster",
      "MG RX5"
    ]
  },
  {
    name: "BYD",
    popular: false,
    aliases: ["byd"],
    models: [
      "Atto 3",
      "Dolphin",
      "Seal",
      "Han",
      "Tang",
      "Song Plus"
    ]
  },
  {
    name: "Honda",
    popular: false,
    aliases: ["honda"],
    models: [
      "Civic",
      "Accord",
      "CR-V",
      "HR-V",
      "City",
      "Jazz",
      "ZR-V"
    ]
  },
  {
    name: "Lexus",
    popular: false,
    aliases: ["lexus"],
    models: [
      "IS",
      "ES",
      "LS",
      "UX",
      "NX",
      "RX",
      "GX",
      "LX",
      "LC"
    ]
  },
  {
    name: "Genesis",
    popular: false,
    aliases: ["genesis"],
    models: [
      "G70",
      "G80",
      "G90",
      "GV70",
      "GV80"
    ]
  },
  {
    name: "DS Automobiles",
    popular: false,
    aliases: ["ds"],
    models: [
      "DS 3",
      "DS 3 Crossback",
      "DS 4",
      "DS 7",
      "DS 7 Crossback",
      "DS 9"
    ]
  }
];

/**
 * Searches vehicle makes by query.
 * Matches on make name or any configured aliases.
 */
export function searchMakes(query: string): CarMake[] {
  const clean = (query || "").trim().toLowerCase();
  if (!clean) {
    // Return popular first, then alphabetical
    return [...CAR_CATALOG].sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return CAR_CATALOG.filter((item) => {
    const matchName = item.name.toLowerCase().includes(clean);
    const matchAlias = item.aliases?.some((a) => a.toLowerCase().includes(clean));
    return matchName || matchAlias;
  });
}

/**
 * Retrieves all models registered for a specific make (exact or fuzzy match).
 */
export function getModelsForMake(makeName: string): string[] {
  if (!makeName) return [];
  const clean = makeName.trim().toLowerCase();
  
  const found = CAR_CATALOG.find(
    (item) =>
      item.name.toLowerCase() === clean ||
      item.aliases?.some((a) => a.toLowerCase() === clean)
  );

  return found ? found.models : [];
}

/**
 * Searches models. If makeName is provided, searches within that make's models.
 * Otherwise searches across all models in the entire catalog.
 */
export function searchModels(
  query: string,
  makeName?: string
): { model: string; make: string }[] {
  const clean = (query || "").trim().toLowerCase();

  if (makeName) {
    const models = getModelsForMake(makeName);
    if (models.length > 0) {
      const filtered = clean
        ? models.filter((m) => m.toLowerCase().includes(clean))
        : models;
      return filtered.map((m) => ({ model: m, make: makeName }));
    }
  }

  // Search across all catalog makes & models
  const results: { model: string; make: string }[] = [];
  for (const item of CAR_CATALOG) {
    for (const m of item.models) {
      if (!clean || m.toLowerCase().includes(clean) || item.name.toLowerCase().includes(clean)) {
        results.push({ model: m, make: item.name });
      }
    }
  }

  return results;
}

/**
 * Attempts to guess the Make given a Model name.
 */
export function findMakeForModel(modelName: string): string | null {
  if (!modelName) return null;
  const clean = modelName.trim().toLowerCase();

  for (const item of CAR_CATALOG) {
    if (item.models.some((m) => m.toLowerCase() === clean)) {
      return item.name;
    }
  }
  return null;
}
