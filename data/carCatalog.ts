export interface CarMake {
  name: string;
  popular?: boolean;
  aliases?: string[];
  models: string[];
}

export const CAR_CATALOG: CarMake[] = [
  // ==========================================
  // TOP FLEET & POPULAR LUXURY / RENTAL MAKES
  // ==========================================
  {
    name: "Mercedes-Benz",
    popular: true,
    aliases: ["mercedes", "benz", "merc", "amg"],
    models: [
      "A-Class",
      "A-Class Sedan",
      "A 200",
      "A 250",
      "A 45 AMG",
      "B-Class",
      "C-Class",
      "C-Class Coupe",
      "C-Class Cabriolet",
      "C-Class Estate",
      "C 180",
      "C 200",
      "C 220 d",
      "C 300",
      "C 43 AMG",
      "C 63 AMG",
      "CLA",
      "CLA Coupe",
      "CLA Shooting Brake",
      "CLA 200",
      "CLA 220",
      "CLA 250",
      "CLA 45 AMG",
      "CLE",
      "CLE Coupe",
      "CLE Cabriolet",
      "CLS",
      "CLS Coupe",
      "CLS 350",
      "CLS 400",
      "CLS 53 AMG",
      "E-Class",
      "E-Class Coupe",
      "E-Class Cabriolet",
      "E-Class Estate",
      "E 200",
      "E 220 d",
      "E 300",
      "E 350",
      "E 400",
      "E 53 AMG",
      "E 63 AMG",
      "S-Class",
      "S 350 d",
      "S 400",
      "S 450",
      "S 500",
      "S 580",
      "S 63 AMG",
      "S-Class Maybach (S 680)",
      "GLA",
      "GLA 200",
      "GLA 250",
      "GLA 35 AMG",
      "GLA 45 AMG",
      "GLB",
      "GLB 200",
      "GLB 250",
      "GLC",
      "GLC Coupe",
      "GLC 200",
      "GLC 220 d",
      "GLC 300",
      "GLC 43 AMG",
      "GLC 63 AMG",
      "GLE",
      "GLE Coupe",
      "GLE 350",
      "GLE 400 d",
      "GLE 450",
      "GLE 53 AMG",
      "GLE 63 AMG",
      "GLS",
      "GLS 450",
      "GLS 580",
      "GLS 63 AMG",
      "GLS Maybach (GLS 600)",
      "G-Class",
      "G 500",
      "G 63 AMG",
      "G 400 d",
      "EQA",
      "EQB",
      "EQC",
      "EQE",
      "EQE SUV",
      "EQS",
      "EQS SUV",
      "V-Class",
      "V-Class Exclusive",
      "V 250 d",
      "V 300 d",
      "Vito",
      "Vito Tourer",
      "Sprinter",
      "Citan",
      "AMG GT",
      "AMG GT 4-Door",
      "SL Roadster",
      "SLC",
      "SLK"
    ]
  },
  {
    name: "BMW",
    popular: true,
    aliases: ["bimmer", "bm"],
    models: [
      "1 Series",
      "116i",
      "118i",
      "118d",
      "120i",
      "120d",
      "M135i",
      "2 Series",
      "2 Series Active Tourer",
      "2 Series Gran Coupe",
      "2 Series Coupe",
      "218i",
      "220i",
      "220d",
      "M235i",
      "M240i",
      "3 Series",
      "3 Series Touring",
      "318i",
      "320i",
      "320d",
      "330i",
      "330e",
      "M340i",
      "4 Series",
      "4 Series Coupe",
      "4 Series Gran Coupe",
      "4 Series Convertible",
      "420i",
      "420d",
      "430i",
      "M440i",
      "5 Series",
      "5 Series Touring",
      "520i",
      "520d",
      "530i",
      "530e",
      "540i",
      "M550i",
      "6 Series Gran Coupe",
      "6 Series Gran Turismo",
      "7 Series",
      "730Li",
      "740Li",
      "745e",
      "750Li",
      "760Li",
      "8 Series",
      "8 Series Coupe",
      "8 Series Gran Coupe",
      "8 Series Convertible",
      "840i",
      "M850i",
      "X1",
      "X1 sDrive18i",
      "X1 xDrive20d",
      "X1 M35i",
      "X2",
      "X2 sDrive18i",
      "X2 M35i",
      "X3",
      "X3 sDrive20i",
      "X3 xDrive30i",
      "X3 M40i",
      "X4",
      "X4 xDrive30i",
      "X4 M40i",
      "X5",
      "X5 xDrive30d",
      "X5 xDrive40i",
      "X5 xDrive45e",
      "X5 M50i",
      "X6",
      "X6 xDrive40i",
      "X6 M50i",
      "X7",
      "X7 xDrive40i",
      "X7 M60i",
      "XM",
      "Z4",
      "Z4 sDrive20i",
      "Z4 M40i",
      "i4",
      "i4 eDrive40",
      "i4 M50",
      "i5",
      "i7",
      "i7 xDrive60",
      "iX1",
      "iX2",
      "iX3",
      "iX",
      "iX xDrive40",
      "iX xDrive50",
      "M2",
      "M3",
      "M3 Competition",
      "M4",
      "M4 Competition",
      "M5",
      "M5 Competition",
      "M8",
      "M8 Competition",
      "X3 M",
      "X4 M",
      "X5 M",
      "X6 M"
    ]
  },
  {
    name: "Audi",
    popular: true,
    aliases: ["audi"],
    models: [
      "A1",
      "A1 Sportback",
      "A3",
      "A3 Sportback",
      "A3 Sedan",
      "A4",
      "A4 Sedan",
      "A4 Avant",
      "A4 Allroad",
      "A5",
      "A5 Coupe",
      "A5 Sportback",
      "A5 Cabriolet",
      "A6",
      "A6 Sedan",
      "A6 Avant",
      "A6 Allroad",
      "A7",
      "A7 Sportback",
      "A8",
      "A8 L",
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
      "e-tron",
      "e-tron GT",
      "RS e-tron GT",
      "TT",
      "TT Coupe",
      "TT Roadster",
      "R8",
      "R8 Spyder",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "SQ2",
      "SQ5",
      "SQ7",
      "SQ8",
      "RS3",
      "RS3 Sportback",
      "RS3 Sedan",
      "RS4 Avant",
      "RS5",
      "RS5 Coupe",
      "RS5 Sportback",
      "RS6 Avant",
      "RS7 Sportback",
      "RS Q3",
      "RS Q8"
    ]
  },
  {
    name: "Range Rover",
    popular: true,
    aliases: ["land rover", "rangerover", "landrover", "rover"],
    models: [
      "Range Rover",
      "Range Rover Vogue",
      "Range Rover Autobiography",
      "Range Rover SV",
      "Range Rover LWB (Long Wheelbase)",
      "Range Rover Sport",
      "Range Rover Sport Dynamic",
      "Range Rover Sport Autobiography",
      "Range Rover Sport SVR",
      "Range Rover Sport SV",
      "Range Rover Velar",
      "Range Rover Velar R-Dynamic",
      "Range Rover Evoque",
      "Range Rover Evoque R-Dynamic",
      "Defender 90",
      "Defender 110",
      "Defender 130",
      "Defender V8",
      "Defender X-Dynamic",
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
      "911 Carrera S",
      "911 Carrera 4S",
      "911 Carrera GTS",
      "911 Targa 4",
      "911 Targa 4S",
      "911 Turbo",
      "911 Turbo S",
      "911 GT3",
      "911 GT3 RS",
      "911 Dakar",
      "Cayenne",
      "Cayenne S",
      "Cayenne GTS",
      "Cayenne Turbo",
      "Cayenne Turbo GT",
      "Cayenne E-Hybrid",
      "Cayenne Coupe",
      "Cayenne Coupe S",
      "Cayenne Coupe Turbo",
      "Macan",
      "Macan T",
      "Macan S",
      "Macan GTS",
      "Macan EV",
      "Panamera",
      "Panamera 4",
      "Panamera 4S",
      "Panamera GTS",
      "Panamera Turbo S",
      "Panamera E-Hybrid",
      "Taycan",
      "Taycan 4S",
      "Taycan GTS",
      "Taycan Turbo",
      "Taycan Turbo S",
      "Taycan Cross Turismo",
      "718 Boxster",
      "718 Boxster S",
      "718 Boxster GTS",
      "718 Cayman",
      "718 Cayman S",
      "718 Cayman GTS",
      "718 Cayman GT4",
      "718 Cayman GT4 RS"
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
      "Golf GTD",
      "Golf GTE",
      "Golf R",
      "Golf Variant",
      "Polo",
      "Polo GTI",
      "Passat",
      "Passat CC",
      "Passat Variant",
      "Arteon",
      "Arteon R",
      "Arteon Shooting Brake",
      "T-Roc",
      "T-Roc R",
      "T-Roc Cabriolet",
      "T-Cross",
      "Taigo",
      "Tiguan",
      "Tiguan R-Line",
      "Tiguan Allspace",
      "Touareg",
      "Touareg R-Line",
      "Touareg R",
      "Touran",
      "Sharan",
      "Caddy",
      "Caddy Maxi",
      "Transporter (T6/T6.1)",
      "Caravelle",
      "Multivan (T7)",
      "Crafter",
      "Amarok",
      "ID.3",
      "ID.4",
      "ID.5",
      "ID.7",
      "ID. Buzz",
      "Jetta",
      "Scirocco",
      "Beetle",
      "Up!"
    ]
  },
  {
    name: "Dacia",
    popular: true,
    aliases: ["dacia"],
    models: [
      "Sandero",
      "Sandero 2",
      "Sandero 3",
      "Sandero Stepway",
      "Logan",
      "Logan 2",
      "Logan 3",
      "Duster",
      "Duster 2",
      "Duster 3",
      "Jogger",
      "Spring",
      "Dokker",
      "Dokker Van",
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
      "Clio RS Line",
      "Megane",
      "Megane 4",
      "Megane Sedan",
      "Megane Estate",
      "Megane E-Tech",
      "Megane RS",
      "Captur",
      "Austral",
      "Arkana",
      "Kadjar",
      "Koleos",
      "Rafale",
      "Symbioz",
      "Talisman",
      "Talisman Estate",
      "Scenic",
      "Grand Scenic",
      "Scenic E-Tech",
      "Espace",
      "Twingo",
      "Zoe",
      "Express",
      "Express Van",
      "Kangoo",
      "Kangoo Van",
      "Trafic",
      "Trafic Combi",
      "Master",
      "Master Fourgon"
    ]
  },
  {
    name: "Peugeot",
    popular: true,
    aliases: ["peugeot"],
    models: [
      "208",
      "208 GT",
      "e-208",
      "308",
      "308 SW",
      "308 GT",
      "e-308",
      "408",
      "508",
      "508 SW",
      "508 PSE",
      "2008",
      "2008 GT",
      "e-2008",
      "3008",
      "3008 GT",
      "e-3008",
      "5008",
      "5008 GT",
      "e-5008",
      "Rifter",
      "Partner",
      "Expert",
      "Expert Combi",
      "Boxer",
      "Traveller",
      "108",
      "301",
      "504"
    ]
  },
  {
    name: "Citroën",
    popular: true,
    aliases: ["citroen", "citroën"],
    models: [
      "C3",
      "C3 Aircross",
      "ë-C3",
      "C4",
      "C4 X",
      "ë-C4",
      "C5 Aircross",
      "C5 X",
      "Berlingo",
      "Berlingo Van",
      "Jumpy",
      "SpaceTourer",
      "Jumper",
      "C-Elysée",
      "C1",
      "Ami"
    ]
  },
  {
    name: "Toyota",
    popular: true,
    aliases: ["toyota"],
    models: [
      "Yaris",
      "Yaris Sedan",
      "Yaris Cross",
      "GR Yaris",
      "Corolla",
      "Corolla Sedan",
      "Corolla Hatchback",
      "Corolla Cross",
      "GR Corolla",
      "Camry",
      "Camry Hybrid",
      "Avalon",
      "Crown",
      "RAV4",
      "RAV4 Hybrid",
      "RAV4 Prime",
      "Land Cruiser",
      "Land Cruiser 300",
      "Land Cruiser 200",
      "Land Cruiser 70",
      "Land Cruiser Prado",
      "Prado 250",
      "Hilux",
      "Hilux Double Cab",
      "Hilux GR Sport",
      "Fortuner",
      "Highlander",
      "Grand Highlander",
      "Sequoia",
      "Tundra",
      "Tacoma",
      "4Runner",
      "C-HR",
      "Prius",
      "Prius Prime",
      "Supra (GR Supra)",
      "GR86",
      "Sienna",
      "Innova",
      "Avanza",
      "Rush",
      "Raize",
      "Veloz",
      "Proace",
      "Proace City",
      "Hiace",
      "Coaster",
      "Aygo",
      "Aygo X",
      "bZ4X"
    ]
  },
  {
    name: "Hyundai",
    popular: true,
    aliases: ["hyundai"],
    models: [
      "i10",
      "Grand i10",
      "i20",
      "i20 N",
      "i30",
      "i30 N",
      "i30 Fastback",
      "Accent",
      "Elantra",
      "Elantra N",
      "Sonata",
      "Azera / Grandeur",
      "Tucson",
      "Tucson Hybrid",
      "Tucson N Line",
      "Santa Fe",
      "Santa Fe Hybrid",
      "Palisade",
      "Kona",
      "Kona Electric",
      "Kona N",
      "Creta",
      "Creta Grand",
      "Venue",
      "Bayon",
      "Staria",
      "Staria Premium",
      "H-1",
      "H-100",
      "Ioniq 5",
      "Ioniq 5 N",
      "Ioniq 6",
      "Custin"
    ]
  },
  {
    name: "Kia",
    popular: true,
    aliases: ["kia"],
    models: [
      "Picanto",
      "Picanto GT-Line",
      "Rio",
      "Pegas",
      "Ceed",
      "ProCeed",
      "XCeed",
      "Cerato / Forte",
      "K3",
      "K5 (Optima)",
      "K8",
      "K900 / K9",
      "Cadenza",
      "Stinger",
      "Stinger GT",
      "Sportage",
      "Sportage Hybrid",
      "Sportage GT-Line",
      "Sorento",
      "Sorento Hybrid",
      "Telluride",
      "Seltos",
      "Sonet",
      "Carens",
      "Carnival (Sedona)",
      "Niro",
      "Soul",
      "EV6",
      "EV6 GT",
      "EV9",
      "EV3",
      "K2500",
      "K2700"
    ]
  },
  {
    name: "Nissan",
    popular: true,
    aliases: ["nissan"],
    models: [
      "Micra / March",
      "Sunny",
      "Almera",
      "Sentra",
      "Altima",
      "Maxima",
      "Kicks",
      "Juke",
      "Qashqai",
      "X-Trail / Rogue",
      "Murano",
      "Pathfinder",
      "Armada",
      "Patrol",
      "Patrol Safari",
      "Patrol NISMO",
      "Patrol Super Safari",
      "Navara",
      "Frontier",
      "Titan",
      "Urvan / NV350",
      "NV200",
      "Ariya",
      "Leaf",
      "Z (400Z)",
      "370Z",
      "GT-R (R35)"
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
      "Taurus",
      "Mustang",
      "Mustang GT",
      "Mustang Dark Horse",
      "Mustang Mach 1",
      "Mustang Shelby GT500",
      "Mustang Mach-E",
      "Puma",
      "Puma ST",
      "Kuga / Escape",
      "Edge",
      "Explorer",
      "Explorer ST",
      "Expedition",
      "Expedition Max",
      "Bronco",
      "Bronco Badlands",
      "Bronco Raptor",
      "Bronco Sport",
      "Everest",
      "Territory",
      "Ranger",
      "Ranger Wildtrak",
      "Ranger Raptor",
      "F-150",
      "F-150 Lariat",
      "F-150 King Ranch",
      "F-150 Raptor",
      "F-150 Lightning",
      "Super Duty (F-250 / F-350)",
      "Transit",
      "Transit Custom",
      "Tourneo Custom",
      "Tourneo Courier",
      "Tourneo Connect"
    ]
  },
  {
    name: "Fiat",
    popular: true,
    aliases: ["fiat"],
    models: [
      "500",
      "500C",
      "500X",
      "500L",
      "500e",
      "600",
      "600e",
      "Panda",
      "Panda Cross",
      "Tipo",
      "Tipo Sedan",
      "Tipo Hatchback",
      "Tipo Cross",
      "Tipo Station Wagon",
      "Punto",
      "Doblo",
      "Doblo Cargo",
      "Ducato",
      "Fiorino",
      "Scudo",
      "Talento",
      "Strada",
      "Toro",
      "Fastback",
      "Pulse"
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
      "Grand Cherokee L",
      "Grand Cherokee 4xe",
      "Grand Cherokee Trackhawk",
      "Wrangler",
      "Wrangler Sport",
      "Wrangler Sahara",
      "Wrangler Rubicon",
      "Wrangler Rubicon 392",
      "Wrangler 4xe",
      "Gladiator",
      "Gladiator Rubicon",
      "Wagoneer",
      "Grand Wagoneer",
      "Avenger"
    ]
  },
  {
    name: "SEAT",
    popular: true,
    aliases: ["seat"],
    models: [
      "Ibiza",
      "Ibiza FR",
      "Leon",
      "Leon FR",
      "Leon Sportstourer",
      "Arona",
      "Arona FR",
      "Ateca",
      "Ateca FR",
      "Tarraco",
      "Tarraco FR",
      "Toledo",
      "Alhambra",
      "Mii"
    ]
  },
  {
    name: "CUPRA",
    popular: true,
    aliases: ["cupra"],
    models: [
      "Formentor",
      "Formentor VZ",
      "Formentor VZ5",
      "Leon",
      "Leon VZ",
      "Leon Sportstourer",
      "Ateca",
      "Born",
      "Tavascan",
      "Terramar"
    ]
  },
  {
    name: "Skoda",
    popular: true,
    aliases: ["skoda", "škoda"],
    models: [
      "Fabia",
      "Fabia Monte Carlo",
      "Scala",
      "Octavia",
      "Octavia Combi",
      "Octavia RS",
      "Superb",
      "Superb Combi",
      "Kamiq",
      "Karoq",
      "Kodiaq",
      "Kodiaq RS",
      "Enyaq iV",
      "Enyaq Coupe iV",
      "Enyaq RS",
      "Elroq",
      "Rapid"
    ]
  },
  {
    name: "Volvo",
    popular: true,
    aliases: ["volvo"],
    models: [
      "XC40",
      "XC40 Recharge",
      "XC60",
      "XC60 Recharge",
      "XC90",
      "XC90 Recharge",
      "EX30",
      "EX90",
      "EC40",
      "S60",
      "S90",
      "V60",
      "V60 Cross Country",
      "V90",
      "V90 Cross Country"
    ]
  },

  // ==========================================
  // CHINESE MAKES (POPULAR FLEET & RENTAL)
  // ==========================================
  {
    name: "Geely",
    popular: true,
    aliases: ["geely"],
    models: [
      "Coolray",
      "Emgrand",
      "Monjaro",
      "Tugella",
      "Okavango",
      "Starray",
      "Preface",
      "Geometry C",
      "Azkarra",
      "GX3 Pro",
      "Haoyue"
    ]
  },
  {
    name: "Chery",
    popular: true,
    aliases: ["chery"],
    models: [
      "Tiggo 2 Pro",
      "Tiggo 4 Pro",
      "Tiggo 7 Pro",
      "Tiggo 7 Pro Max",
      "Tiggo 8 Pro",
      "Tiggo 8 Pro Max",
      "Arrizo 5",
      "Arrizo 6 Pro",
      "Arrizo 8",
      "Omoda 5"
    ]
  },
  {
    name: "Jetour",
    popular: true,
    aliases: ["jetour"],
    models: [
      "Dashing",
      "T2 (Traveller)",
      "X70",
      "X70 Plus",
      "X70 Fl",
      "X90 Plus",
      "X95",
      "Shanhai T2"
    ]
  },
  {
    name: "Haval",
    popular: true,
    aliases: ["haval"],
    models: [
      "Jolion",
      "Jolion Pro",
      "H6",
      "H6 GT",
      "H6 HEV",
      "H9",
      "Dargo",
      "M6"
    ]
  },
  {
    name: "Changan",
    popular: true,
    aliases: ["changan"],
    models: [
      "CS35 Plus",
      "CS55 Plus",
      "CS75 Plus",
      "CS85 Coupe",
      "CS95",
      "Alsvin",
      "Eado Plus",
      "UNI-T",
      "UNI-K",
      "UNI-V",
      "Hunter"
    ]
  },
  {
    name: "MG",
    popular: true,
    aliases: ["mg", "morris garages"],
    models: [
      "MG 3",
      "MG 4 EV",
      "MG 5",
      "MG 6",
      "MG 7",
      "MG GT",
      "MG ZS",
      "MG ZS EV",
      "MG HS",
      "MG RX5",
      "MG RX8",
      "MG One",
      "MG Whale",
      "MG Cyberster",
      "MG T60"
    ]
  },
  {
    name: "BYD",
    popular: true,
    aliases: ["byd"],
    models: [
      "Atto 3",
      "Dolphin",
      "Seal",
      "Seal U",
      "Han",
      "Tang",
      "Song Plus",
      "Qin Plus",
      "Seagull",
      "Yangwang U8"
    ]
  },
  {
    name: "Jaecoo",
    popular: false,
    aliases: ["jaecoo"],
    models: [
      "J7",
      "J7 AWD",
      "J8"
    ]
  },
  {
    name: "Omoda",
    popular: false,
    aliases: ["omoda"],
    models: [
      "Omoda 5",
      "Omoda C5",
      "Omoda E5",
      "Omoda S5"
    ]
  },
  {
    name: "Tank",
    popular: false,
    aliases: ["tank", "gwm tank"],
    models: [
      "Tank 300",
      "Tank 300 HEV",
      "Tank 400",
      "Tank 500",
      "Tank 500 HEV",
      "Tank 700"
    ]
  },
  {
    name: "Hongqi",
    popular: false,
    aliases: ["hongqi"],
    models: [
      "H5",
      "H9",
      "HS3",
      "HS5",
      "HS7",
      "E-HS9",
      "Ousado"
    ]
  },
  {
    name: "BAIC",
    popular: false,
    aliases: ["baic"],
    models: [
      "BJ40 Plus",
      "BJ40 SE",
      "BJ60",
      "BJ80",
      "X35",
      "X55",
      "X7"
    ]
  },
  {
    name: "GAC Motor",
    popular: false,
    aliases: ["gac", "trumpchi"],
    models: [
      "Emkoo",
      "Empow",
      "GS3 Emzoom",
      "GS4",
      "GS4 Max",
      "GS8",
      "M6 Pro",
      "M8"
    ]
  },
  {
    name: "Great Wall Motor",
    popular: false,
    aliases: ["gwm", "great wall"],
    models: [
      "Poer",
      "Wingle 5",
      "Wingle 7",
      "Cannon",
      "Ora Good Cat",
      "Ora 03"
    ]
  },
  {
    name: "Dongfeng",
    popular: false,
    aliases: ["dongfeng", "dfm"],
    models: [
      "Shine",
      "Shine Max",
      "AX7",
      "Forthing T5 EVO",
      "M4 U-Tour",
      "Rich 6",
      "M-Hero 917"
    ]
  },
  {
    name: "DFSK",
    popular: false,
    aliases: ["dfsk", "glory", "seres"],
    models: [
      "Glory 500",
      "Glory 560",
      "Glory 580",
      "Glory ix5",
      "Glory ix7",
      "Seres 3",
      "Seres 5",
      "K01",
      "EC35"
    ]
  },
  {
    name: "Lynk & Co",
    popular: false,
    aliases: ["lynk", "lynk & co", "lynk and co"],
    models: [
      "01",
      "02",
      "03",
      "03+",
      "05",
      "06",
      "08",
      "09"
    ]
  },
  {
    name: "Zeekr",
    popular: false,
    aliases: ["zeekr"],
    models: [
      "001",
      "001 FR",
      "007",
      "009",
      "X"
    ]
  },
  {
    name: "Nio",
    popular: false,
    aliases: ["nio"],
    models: [
      "ES6",
      "ES8",
      "ET5",
      "ET5 Touring",
      "ET7",
      "EC6",
      "EC7",
      "EL6"
    ]
  },
  {
    name: "Xpeng",
    popular: false,
    aliases: ["xpeng"],
    models: [
      "G3i",
      "G6",
      "G9",
      "P5",
      "P7",
      "P7i",
      "X9"
    ]
  },

  // ==========================================
  // AMERICAN TRUCKS & LUXURY (GMC, RAM, CADILLAC...)
  // ==========================================
  {
    name: "GMC",
    popular: true,
    aliases: ["gmc"],
    models: [
      "Yukon",
      "Yukon XL",
      "Yukon Denali",
      "Yukon Denali Ultimate",
      "Yukon AT4",
      "Sierra 1500",
      "Sierra Denali",
      "Sierra AT4",
      "Sierra HD (2500 / 3500)",
      "Terrain",
      "Acadia",
      "Hummer EV Pickup",
      "Hummer EV SUV"
    ]
  },
  {
    name: "Chevrolet",
    popular: true,
    aliases: ["chevy", "chevrolet"],
    models: [
      "Spark",
      "Aveo",
      "Optra",
      "Malibu",
      "Impala",
      "Camaro",
      "Camaro SS",
      "Camaro ZL1",
      "Corvette (C8)",
      "Corvette Stingray",
      "Corvette Z06",
      "Corvette E-Ray",
      "Trax",
      "Trailblazer",
      "Equinox",
      "Traverse",
      "Tahoe",
      "Tahoe Z71",
      "Tahoe RST",
      "Tahoe High Country",
      "Suburban",
      "Captiva",
      "Groove",
      "Blazer",
      "Silverado 1500",
      "Silverado High Country",
      "Silverado Trail Boss",
      "Silverado HD",
      "Express Van",
      "Colorado"
    ]
  },
  {
    name: "Dodge",
    popular: true,
    aliases: ["dodge"],
    models: [
      "Charger",
      "Charger GT",
      "Charger R/T",
      "Charger Scat Pack",
      "Charger SRT Hellcat",
      "Challenger",
      "Challenger R/T",
      "Challenger Scat Pack",
      "Challenger SRT Hellcat",
      "Durango",
      "Durango GT",
      "Durango R/T",
      "Durango SRT 392",
      "Durango SRT Hellcat",
      "Hornet",
      "Dart",
      "Journey",
      "Neon"
    ]
  },
  {
    name: "RAM",
    popular: true,
    aliases: ["ram", "dodge ram"],
    models: [
      "RAM 1500",
      "RAM 1500 Bighorn",
      "RAM 1500 Laramie",
      "RAM 1500 Rebel",
      "RAM 1500 Limited",
      "RAM 1500 TRX",
      "RAM 2500",
      "RAM 3500",
      "RAM ProMaster",
      "RAM 700",
      "RAM 1200"
    ]
  },
  {
    name: "Cadillac",
    popular: true,
    aliases: ["cadillac", "caddy"],
    models: [
      "Escalade",
      "Escalade ESV",
      "Escalade Sport",
      "Escalade Platinum",
      "Escalade-V",
      "CT4",
      "CT4-V",
      "CT4-V Blackwing",
      "CT5",
      "CT5-V",
      "CT5-V Blackwing",
      "XT4",
      "XT5",
      "XT6",
      "Lyriq",
      "Celestiq"
    ]
  },
  {
    name: "Lincoln",
    popular: false,
    aliases: ["lincoln"],
    models: [
      "Navigator",
      "Navigator L",
      "Aviator",
      "Nautilus",
      "Corsair",
      "Continental",
      "MKZ",
      "MKX"
    ]
  },
  {
    name: "Chrysler",
    popular: false,
    aliases: ["chrysler"],
    models: [
      "300",
      "300C",
      "300S",
      "Pacifica",
      "Pacifica Hybrid",
      "Voyager",
      "Grand Voyager",
      "200"
    ]
  },
  {
    name: "Tesla",
    popular: true,
    aliases: ["tesla"],
    models: [
      "Model 3",
      "Model 3 Long Range",
      "Model 3 Performance",
      "Model Y",
      "Model Y Long Range",
      "Model Y Performance",
      "Model S",
      "Model S Plaid",
      "Model X",
      "Model X Plaid",
      "Cybertruck"
    ]
  },

  // ==========================================
  // JAPANESE & ASIAN POPULAR MAKES
  // ==========================================
  {
    name: "Honda",
    popular: true,
    aliases: ["honda"],
    models: [
      "Civic",
      "Civic Sedan",
      "Civic Hatchback",
      "Civic Si",
      "Civic Type R",
      "Accord",
      "Accord Hybrid",
      "City",
      "Jazz / Fit",
      "HR-V",
      "ZR-V",
      "CR-V",
      "CR-V Hybrid",
      "Passport",
      "Pilot",
      "Odyssey",
      "Ridgeline"
    ]
  },
  {
    name: "Mazda",
    popular: true,
    aliases: ["mazda"],
    models: [
      "Mazda 2",
      "Mazda 3",
      "Mazda 3 Sedan",
      "Mazda 3 Hatchback",
      "Mazda 6",
      "CX-3",
      "CX-30",
      "CX-5",
      "CX-50",
      "CX-60",
      "CX-70",
      "CX-80",
      "CX-9",
      "CX-90",
      "MX-5 Miata",
      "MX-5 RF",
      "BT-50"
    ]
  },
  {
    name: "Lexus",
    popular: true,
    aliases: ["lexus"],
    models: [
      "IS",
      "IS 300",
      "IS 350",
      "IS 500",
      "ES",
      "ES 250",
      "ES 300h",
      "ES 350",
      "LS",
      "LS 500",
      "LS 500h",
      "UX",
      "NX",
      "NX 250",
      "NX 350",
      "NX 350h",
      "RX",
      "RX 350",
      "RX 500h",
      "GX",
      "GX 460",
      "GX 550",
      "LX",
      "LX 570",
      "LX 600",
      "TX",
      "RC",
      "RC F",
      "LC",
      "LC 500",
      "LC 500 Convertible"
    ]
  },
  {
    name: "Genesis",
    popular: false,
    aliases: ["genesis"],
    models: [
      "G70",
      "G70 Shooting Brake",
      "G80",
      "Electrified G80",
      "G90",
      "GV60",
      "GV70",
      "Electrified GV70",
      "GV80",
      "GV80 Coupe"
    ]
  },
  {
    name: "Infiniti",
    popular: false,
    aliases: ["infiniti"],
    models: [
      "Q50",
      "Q60",
      "Q70",
      "QX50",
      "QX55",
      "QX60",
      "QX80"
    ]
  },
  {
    name: "Suzuki",
    popular: true,
    aliases: ["suzuki"],
    models: [
      "Swift",
      "Swift Sport",
      "Dzire",
      "Baleno",
      "Ciaz",
      "Celerio",
      "Alto",
      "Jimny",
      "Jimny 5-Door",
      "Vitara",
      "Grand Vitara",
      "S-Cross",
      "Ertiga",
      "Fronx",
      "XL7"
    ]
  },
  {
    name: "Mitsubishi",
    popular: true,
    aliases: ["mitsubishi"],
    models: [
      "Mirage / Space Star",
      "Attrage",
      "Lancer",
      "Eclipse Cross",
      "ASX / Outlander Sport",
      "Outlander",
      "Outlander PHEV",
      "Pajero",
      "Pajero Sport / Montero Sport",
      "L200 / Triton",
      "Xpander",
      "Xpander Cross"
    ]
  },
  {
    name: "Subaru",
    popular: false,
    aliases: ["subaru"],
    models: [
      "Impreza",
      "Crosstrek / XV",
      "Forester",
      "Outback",
      "Legacy",
      "Ascent",
      "WRX",
      "WRX STI",
      "BRZ",
      "Solterra"
    ]
  },
  {
    name: "Isuzu",
    popular: false,
    aliases: ["isuzu"],
    models: [
      "D-Max",
      "D-Max Double Cab",
      "D-Max V-Cross",
      "mu-X",
      "NPR",
      "NQR"
    ]
  },
  {
    name: "SsangYong",
    popular: false,
    aliases: ["ssangyong", "kgm", "kg mobility"],
    models: [
      "Tivoli",
      "Korando",
      "Torres",
      "Rexton",
      "Musso",
      "Musso Grand"
    ]
  },

  // ==========================================
  // SUPER LUXURY, EXOTICS & SPECIALTY
  // ==========================================
  {
    name: "Ferrari",
    popular: false,
    aliases: ["ferrari"],
    models: [
      "Roma",
      "Roma Spider",
      "Portofino M",
      "296 GTB",
      "296 GTS",
      "F8 Tributo",
      "F8 Spider",
      "812 Superfast",
      "812 GTS",
      "812 Competizione",
      "Purosangue",
      "SF90 Stradale",
      "SF90 Spider",
      "SF90 XX",
      "12Cilindri",
      "488 GTB",
      "488 Spider",
      "458 Italia",
      "California T",
      "GTC4Lusso",
      "LaFerrari"
    ]
  },
  {
    name: "Lamborghini",
    popular: false,
    aliases: ["lamborghini", "lambo"],
    models: [
      "Urus",
      "Urus S",
      "Urus Performante",
      "Urus SE",
      "Huracán",
      "Huracán EVO",
      "Huracán EVO Spyder",
      "Huracán STO",
      "Huracán Tecnica",
      "Huracán Sterrato",
      "Revuelto",
      "Temerario",
      "Aventador",
      "Aventador S",
      "Aventador SVJ",
      "Gallardo"
    ]
  },
  {
    name: "Rolls-Royce",
    popular: false,
    aliases: ["rolls", "royce", "rollsroyce"],
    models: [
      "Ghost",
      "Ghost Extended",
      "Ghost Black Badge",
      "Phantom",
      "Phantom Extended",
      "Cullinan",
      "Cullinan Black Badge",
      "Wraith",
      "Wraith Black Badge",
      "Dawn",
      "Spectre"
    ]
  },
  {
    name: "Bentley",
    popular: false,
    aliases: ["bentley"],
    models: [
      "Continental GT",
      "Continental GT Speed",
      "Continental GT Mulliner",
      "Continental GTC",
      "Flying Spur",
      "Flying Spur Speed",
      "Flying Spur Mulliner",
      "Bentayga",
      "Bentayga EWB",
      "Bentayga Speed",
      "Bentayga S"
    ]
  },
  {
    name: "Maserati",
    popular: false,
    aliases: ["maserati"],
    models: [
      "Ghibli",
      "Ghibli Trofeo",
      "Levante",
      "Levante Trofeo",
      "Grecale",
      "Grecale Trofeo",
      "Grecale Folgore",
      "Quattroporte",
      "GranTurismo",
      "GranTurismo Trofeo",
      "GranCabrio",
      "MC20",
      "MC20 Cielo"
    ]
  },
  {
    name: "Aston Martin",
    popular: false,
    aliases: ["aston", "martin"],
    models: [
      "DBX",
      "DBX707",
      "Vantage",
      "Vantage F1 Edition",
      "DB11",
      "DB12",
      "DBS",
      "DBS Superleggera",
      "Vanquish"
    ]
  },
  {
    name: "McLaren",
    popular: false,
    aliases: ["mclaren"],
    models: [
      "720S",
      "720S Spider",
      "750S",
      "750S Spider",
      "765LT",
      "Artura",
      "GT",
      "GTS",
      "570S",
      "600LT"
    ]
  },
  {
    name: "Alfa Romeo",
    popular: false,
    aliases: ["alfa", "romeo"],
    models: [
      "Giulia",
      "Giulia Quadrifoglio",
      "Stelvio",
      "Stelvio Quadrifoglio",
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
      "F-Pace SVR",
      "E-Pace",
      "I-Pace",
      "XE",
      "XF",
      "XJ",
      "F-Type",
      "F-Type R"
    ]
  },
  {
    name: "Mini",
    popular: false,
    aliases: ["mini", "cooper"],
    models: [
      "Cooper",
      "Cooper 3-Door",
      "Cooper 5-Door",
      "Cooper S",
      "John Cooper Works (JCW)",
      "Cabrio",
      "Countryman",
      "Countryman S",
      "Countryman JCW",
      "Clubman",
      "Aceman"
    ]
  },
  {
    name: "Opel",
    popular: false,
    aliases: ["opel", "vauxhall"],
    models: [
      "Corsa",
      "Corsa-e",
      "Astra",
      "Astra Sports Tourer",
      "Mokka",
      "Mokka-e",
      "Crossland",
      "Grandland",
      "Combo Life",
      "Combo Cargo",
      "Vivaro",
      "Zafira Life",
      "Insignia"
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
  },
  {
    name: "Smart",
    popular: false,
    aliases: ["smart"],
    models: [
      "#1",
      "#3",
      "Fortwo",
      "Fortwo Cabrio",
      "Forfour"
    ]
  },
  {
    name: "Iveco",
    popular: false,
    aliases: ["iveco"],
    models: [
      "Daily",
      "Daily Van",
      "Daily Minibus",
      "Daily Chassis Cab"
    ]
  },
  {
    name: "MAN",
    popular: false,
    aliases: ["man"],
    models: [
      "TGE",
      "TGE Van",
      "TGE Combi"
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
