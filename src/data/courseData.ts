export type Priority = "Medium" | "High" | "Very High";

export type Cluster =
  | "Present controls"
  | "Inference tools"
  | "Early Earth and oxygen"
  | "Biological transitions"
  | "Paleozoic-Mesozoic turnovers"
  | "Cenozoic-human impact";

export interface LectureFact {
  number: string;
  title: string;
  priority: Priority;
  cluster: Cluster;
  sourcePath: string;
  role: string;
  goals: string[];
  concepts: string[];
  evidence: string[];
  mechanisms: string[];
  misconception: string;
  correction: string;
}

export const clusters: Cluster[] = [
  "Present controls",
  "Inference tools",
  "Early Earth and oxygen",
  "Biological transitions",
  "Paleozoic-Mesozoic turnovers",
  "Cenozoic-human impact"
];

export const lectures: LectureFact[] = [
  {
    number: "01",
    title: "Introduction to the Course",
    priority: "Medium",
    cluster: "Present controls",
    sourcePath: "content/lectures/01/notes.md",
    role:
      "Sets up Earth environments as dynamic systems shaped by physical and biological controls.",
    goals: [
      "Explain what counts as an Earth surface environment.",
      "Use the course arc: present controls, inference tools, transitions, human impacts.",
      "Apply scientific reasoning to ancient environments."
    ],
    concepts: ["dynamic environments", "scientific method", "physical and biological controls"],
    evidence: ["environment examples", "observation-hypothesis-test logic", "course goal map"],
    mechanisms: ["climate, topography, organisms, and evidence interact to shape environments"],
    misconception: "The course is a loose list of fossil and climate facts.",
    correction:
      "The course is a connected environmental history built from mechanisms and evidence."
  },
  {
    number: "02",
    title: "Earth Energy Budget: Insolation",
    priority: "High",
    cluster: "Present controls",
    sourcePath: "content/lectures/02/notes.md",
    role: "Introduces solar input as the starting control on climate and surface temperature.",
    goals: [
      "Define insolation.",
      "Explain latitudinal and seasonal variation in incoming energy.",
      "Connect uneven heating to climate zones and later feedbacks."
    ],
    concepts: ["insolation", "angle of incidence", "orbital and seasonal variation"],
    evidence: ["energy budget diagrams", "insolation maps", "season and axial tilt diagrams"],
    mechanisms: ["uneven solar heating produces climate gradients"],
    misconception: "The Sun changes randomly enough to explain most course climate events.",
    correction:
      "Insolation is filtered through geometry, albedo, atmosphere, oceans, and feedbacks."
  },
  {
    number: "03",
    title: "The Atmosphere and Climate",
    priority: "High",
    cluster: "Present controls",
    sourcePath: "content/lectures/03/notes.md",
    role: "Explains greenhouse warming, albedo, and atmospheric heat transfer.",
    goals: [
      "Know basic atmospheric properties.",
      "Explain how the atmosphere changes Earth's energy budget.",
      "Describe atmospheric circulation as heat redistribution."
    ],
    concepts: ["greenhouse effect", "albedo", "Hadley circulation"],
    evidence: ["greenhouse diagrams", "global circulation cells", "atmospheric structure diagrams"],
    mechanisms: ["greenhouse gases absorb outgoing infrared radiation and warm the surface"],
    misconception: "Greenhouse effect means any atmospheric change is automatically pollution.",
    correction:
      "The greenhouse effect is a physical warming mechanism; pollution and emissions can alter it."
  },
  {
    number: "04",
    title: "The Ocean",
    priority: "High",
    cluster: "Present controls",
    sourcePath: "content/lectures/04/notes.md",
    role: "Adds oceans as heat reservoirs, climate regulators, and habitat systems.",
    goals: [
      "Describe ocean properties.",
      "Distinguish major marine environments.",
      "Explain ocean effects on climate and energy transfer."
    ],
    concepts: ["thermohaline circulation", "marine zones", "temperature-salinity-density structure"],
    evidence: ["ocean profiles", "surface and deep-current maps", "marine habitat diagrams"],
    mechanisms: ["oceans store and redistribute heat and dissolved materials"],
    misconception: "Oceans only matter as places where fossils are preserved.",
    correction:
      "Oceans also regulate climate, chemistry, circulation, habitat area, and extinction stress."
  },
  {
    number: "05",
    title: "Earth Topography: Plate Tectonics",
    priority: "High",
    cluster: "Present controls",
    sourcePath: "content/lectures/05/notes.md",
    role: "Explains tectonics as a control on topography, continents, ocean basins, and climate context.",
    goals: [
      "Know Earth's internal structure at a useful level.",
      "Distinguish divergent, convergent, transform, and passive margins.",
      "Connect plate motion to environmental change."
    ],
    concepts: ["plate boundaries", "lithosphere and asthenosphere", "paleogeographic control"],
    evidence: ["plate boundary maps", "seafloor spreading diagrams", "earth interior diagrams"],
    mechanisms: ["plate motion changes topography, ocean gateways, volcanism, and habitats"],
    misconception: "Plate tectonics is only about earthquakes and volcanoes.",
    correction:
      "Plate tectonics also controls long-term climate, sea level, habitats, and continental positions."
  },
  {
    number: "06",
    title: "Ecosystem Engineering",
    priority: "High",
    cluster: "Present controls",
    sourcePath: "content/lectures/06/notes.md",
    role: "Shows organisms as active modifiers of environments, not just passive responders.",
    goals: [
      "Define ecosystem engineering.",
      "Recognize organisms that create, modify, or destroy habitats.",
      "Use biological feedbacks in Earth history explanations."
    ],
    concepts: ["ecosystem engineering", "autogenic and allogenic engineers", "habitat modification"],
    evidence: ["reef and forest examples", "burrow and filter-feeding cases", "human engineering examples"],
    mechanisms: ["organisms change physical structure, chemistry, and resource flow"],
    misconception: "Organisms only adapt to environments made by physical processes.",
    correction:
      "Organisms can become major environmental forces that alter later evolution and climate."
  },
  {
    number: "07",
    title: "Rocks and the Rock Cycle",
    priority: "High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/07/notes.md",
    role: "Starts the evidence toolkit by treating rocks as records of process and environment.",
    goals: [
      "Distinguish igneous, sedimentary, and metamorphic rocks.",
      "Understand the rock cycle.",
      "Use rock properties as environmental clues."
    ],
    concepts: ["rock cycle", "sedimentary rocks", "clastic, chemical, and biological sediments"],
    evidence: ["rock type", "texture and grain size", "composition and fossil content"],
    mechanisms: ["weathering, transport, deposition, burial, melting, and uplift recycle materials"],
    misconception: "Rock names are only memorization labels.",
    correction:
      "Rock types are useful because they encode formation processes and environmental settings."
  },
  {
    number: "08",
    title: "Principles of Stratigraphy",
    priority: "High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/08/notes.md",
    role: "Gives the rules for reconstructing event order from rock relationships.",
    goals: [
      "Define uniformitarianism.",
      "Apply basic stratigraphic principles.",
      "Reconstruct sequences of events."
    ],
    concepts: ["superposition", "cross-cutting relationships", "unconformities"],
    evidence: ["relative dating block diagrams", "faunal succession", "stratigraphic contacts"],
    mechanisms: ["rock relationships preserve relative sequence even without exact dates"],
    misconception: "Relative dating is less important because it lacks exact numbers.",
    correction:
      "Relative dating is essential because it reconstructs the sequence that dates then calibrate."
  },
  {
    number: "09",
    title: "The Geologic Timescale",
    priority: "High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/09/notes.md",
    role: "Turns rock sequences into deep-time chronology.",
    goals: [
      "Explain absolute dating.",
      "Explain relative dating.",
      "Use the geologic time scale as the course timeline."
    ],
    concepts: ["radiometric dating", "half-life", "eons, eras, and periods"],
    evidence: ["zircon dates", "magnetic reversals", "geologic time scale"],
    mechanisms: ["radioactive decay and fossil succession calibrate geologic time"],
    misconception: "Exact dates matter more than event order.",
    correction:
      "Relative order and cause-effect placement usually matter more than memorizing exact dates."
  },
  {
    number: "10",
    title: "Inferring Ancient Environments: Sedimentology",
    priority: "Very High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/10/notes.md",
    role: "Uses rock composition, sedimentary structures, and fossils to infer depositional environments.",
    goals: [
      "Use rock composition as an environmental clue.",
      "Use sedimentary structures as environmental evidence.",
      "Use fossils to infer depositional setting."
    ],
    concepts: ["depositional environment", "sedimentary structures", "Hjulstrom curve"],
    evidence: ["grain size", "ripple marks and cross-bedding", "mud cracks and fossil assemblages"],
    mechanisms: ["sedimentary features record flow energy, depth, exposure, and biological setting"],
    misconception: "A single sedimentary clue proves an environment by itself.",
    correction:
      "Environmental interpretations are strongest when composition, structures, fossils, and context agree."
  },
  {
    number: "11",
    title: "Inferring Ancient Environments: Geochemistry",
    priority: "Very High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/11/notes.md",
    role: "Introduces stable isotopes as indirect proxies for climate and carbon-cycle change.",
    goals: [
      "Define stable isotopes.",
      "Explain isotope fractionation.",
      "Use oxygen and carbon isotopes as environmental proxies."
    ],
    concepts: ["stable isotopes", "fractionation", "chemostratigraphy"],
    evidence: ["oxygen isotope curves", "carbon isotope excursions", "isotope ratios"],
    mechanisms: ["fractionation links measured isotope ratios to temperature, ice volume, and carbon cycling"],
    misconception: "Isotope curves directly measure ancient temperature without interpretation.",
    correction:
      "Isotopes are proxies; they require fractionation logic and uncertainty-aware interpretation."
  },
  {
    number: "12",
    title: "Inferring Ancient Environments: Paleogeography",
    priority: "High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/12/notes.md",
    role: "Reconstructs ancient continent and ocean positions so environments can be interpreted in context.",
    goals: [
      "Know how ancient continental positions are reconstructed.",
      "Use paleogeographic maps as interpretations.",
      "Connect geography to climate, circulation, and habitats."
    ],
    concepts: ["paleogeography", "paleomagnetism", "apparent polar wander"],
    evidence: ["fossil matching", "lithologic matching", "paleomagnetic data"],
    mechanisms: ["plate motion changes latitude, gateways, climate zones, and habitat connectivity"],
    misconception: "Ancient rocks can be interpreted using their modern latitude alone.",
    correction:
      "Continents move, so ancient environmental interpretation needs ancient geography."
  },
  {
    number: "13b",
    title: "Earth System Science",
    priority: "Very High",
    cluster: "Inference tools",
    sourcePath: "content/lectures/13b/notes.md",
    role: "Synthesizes climate and environmental change as interactions among Earth systems.",
    goals: [
      "Use the Earth-system science approach.",
      "Know atmosphere, biosphere, geosphere, and hydrosphere components.",
      "Identify forcings, responses, proxies, feedbacks, and uncertainty."
    ],
    concepts: ["Earth-system model", "carbon cycle", "feedback loops"],
    evidence: ["proxy data", "CO2 and sea-level curves", "carbon-cycle diagrams"],
    mechanisms: ["interacting reservoirs and feedbacks determine environmental response"],
    misconception: "One factor, like CO2 or tectonics, explains every climate event alone.",
    correction:
      "Earth-system explanations specify interacting forcings, feedbacks, reservoirs, and uncertainty."
  },
  {
    number: "14",
    title: "The Early Earth and the Origin of Life",
    priority: "High",
    cluster: "Early Earth and oxygen",
    sourcePath: "content/lectures/14/notes.md",
    role: "Begins the deep-time story with early Earth conditions and oldest life evidence.",
    goals: [
      "Describe early Earth conditions.",
      "Know types of oldest life evidence.",
      "Explain why early-life interpretation is difficult."
    ],
    concepts: ["early Earth", "origin of life", "biosignatures"],
    evidence: ["ancient zircons", "microfossils", "stromatolites and carbon isotope signals"],
    mechanisms: ["prebiotic chemistry and early habitable environments allowed life to emerge"],
    misconception: "The oldest claimed life evidence is straightforward and uncontested.",
    correction:
      "Early-life evidence is sparse, altered, and often debated, so evidence quality matters."
  },
  {
    number: "15",
    title: "The Rise of Oxygen",
    priority: "Very High",
    cluster: "Early Earth and oxygen",
    sourcePath: "content/lectures/15/notes.md",
    role: "Explains oxygenic photosynthesis and oxygen accumulation as a major Earth-system transition.",
    goals: [
      "Explain oxygenic photosynthesis.",
      "Know evidence for early oxygenic photosynthesis.",
      "Distinguish oxygen production from oxygen accumulation."
    ],
    concepts: ["oxygenic photosynthesis", "Great Oxidation-style transition", "source-sink balance"],
    evidence: ["stromatolites", "banded iron formations", "red beds and redox minerals"],
    mechanisms: ["oxygen accumulates only after reduced sinks are overwhelmed"],
    misconception: "Once photosynthesis evolves, atmospheric oxygen rises immediately.",
    correction:
      "Oxygen can be produced for a long time before it accumulates because reduced sinks consume it."
  },
  {
    number: "16",
    title: "Snowball Earth",
    priority: "High",
    cluster: "Early Earth and oxygen",
    sourcePath: "content/lectures/16/notes.md",
    role: "Uses a climate controversy to connect evidence, feedbacks, and Earth-system recovery.",
    goals: [
      "Understand the Cryogenian conundrum.",
      "Explain the Snowball Earth hypothesis.",
      "Know major controversies around the hypothesis."
    ],
    concepts: ["Snowball Earth", "ice-albedo feedback", "cap carbonates"],
    evidence: ["low-latitude glacial deposits", "cap carbonates", "glacial stratigraphy"],
    mechanisms: ["runaway albedo cooling can be escaped by volcanic CO2 buildup"],
    misconception: "Snowball Earth is just an example of ordinary ice-age cooling.",
    correction:
      "Snowball Earth is an extreme feedback hypothesis involving low-latitude glaciation and CO2 escape."
  },
  {
    number: "17",
    title: "Origin of Animals: The Cambrian Radiation",
    priority: "Very High",
    cluster: "Biological transitions",
    sourcePath: "content/lectures/17/notes.md",
    role: "Explains rapid animal diversification and its environmental significance.",
    goals: [
      "Know the Precambrian-Cambrian fossil record.",
      "Explain environmental significance of the Cambrian Radiation.",
      "Understand timing debates around animal origins."
    ],
    concepts: ["Cambrian Radiation", "substrate revolution", "skeletonization and predation"],
    evidence: ["trace fossils", "body fossils", "skeletonized fossils"],
    mechanisms: ["animals changed sediments and ecosystems through burrowing, predation, and skeletonization"],
    misconception: "The Cambrian Radiation was simply the first appearance of all animals from nothing.",
    correction:
      "It was a rapid fossil and ecological expansion after earlier roots, shaped by preservation and timing issues."
  },
  {
    number: "18",
    title: "Colonization of the Land",
    priority: "High",
    cluster: "Biological transitions",
    sourcePath: "content/lectures/18/notes.md",
    role: "Covers land plants and animals as major agents of surface environmental change.",
    goals: [
      "Explain the greening of land.",
      "Explain animal colonization of land.",
      "Connect terrestrialization to soils, weathering, carbon, and habitats."
    ],
    concepts: ["terrestrialization", "land plant adaptations", "weathering and CO2 drawdown"],
    evidence: ["plant fossils", "early terrestrial animal fossils", "CO2 and weathering records"],
    mechanisms: ["plants and animals altered soils, habitats, weathering, and carbon cycling"],
    misconception: "Moving onto land was one simple event.",
    correction:
      "Terrestrialization was a sequence of plant and animal adaptations that reshaped environments."
  },
  {
    number: "19",
    title: "Coal Swamps",
    priority: "High",
    cluster: "Biological transitions",
    sourcePath: "content/lectures/19/notes.md",
    role: "Uses the Carboniferous as a case study in carbon burial, oxygen, climate, and ecosystems.",
    goals: [
      "Understand Carboniferous coal swamp environments.",
      "Know coal swamp biotas.",
      "Connect coal formation to atmospheric CO2 and O2."
    ],
    concepts: ["coal swamps", "cyclothems", "organic carbon burial"],
    evidence: ["coal deposits", "Mazon Creek fossils", "O2 and CO2 curves"],
    mechanisms: ["wet anoxic lowlands preserve plant carbon, drawing down CO2 and raising O2"],
    misconception: "Coal is only an economic fuel topic, not an Earth-history record.",
    correction:
      "Coal records ancient ecosystems and carbon burial that affected atmospheric composition."
  },
  {
    number: "20",
    title: "Paleozoic Events and Mass Extinctions",
    priority: "Very High",
    cluster: "Paleozoic-Mesozoic turnovers",
    sourcePath: "content/lectures/20/notes.md",
    role: "Organizes Paleozoic climate, sea level, geography, radiations, and extinctions.",
    goals: [
      "Track post-Cambrian Paleozoic events.",
      "Explain climate, sea level, and paleogeography changes.",
      "Compare Paleozoic radiations and extinctions."
    ],
    concepts: ["Ordovician Radiation", "Late Devonian extinction", "Pangaea and Permian aridification"],
    evidence: ["diversity curves", "Paleozoic paleogeography", "black shales and sea-level records"],
    mechanisms: ["physical changes and ecosystem engineering interact to produce radiations and extinctions"],
    misconception: "The Paleozoic is just a chronological list of periods.",
    correction:
      "The Paleozoic is a repeated interaction among climate, sea level, paleogeography, evolution, and extinction."
  },
  {
    number: "21",
    title: "Mesozoic Events and Mass Extinctions, Part 1",
    priority: "Very High",
    cluster: "Paleozoic-Mesozoic turnovers",
    sourcePath: "content/lectures/21/notes.md",
    role: "Explains the end-Permian extinction and sets up the Mesozoic Marine Revolution.",
    goals: [
      "Understand the end-Permian mass extinction.",
      "Introduce the Mesozoic Marine Revolution.",
      "Connect extinction recovery to ecological opportunity."
    ],
    concepts: ["end-Permian extinction", "Mesozoic Marine Revolution", "durophagy"],
    evidence: ["extinction curves", "large igneous province timing", "Paleozoic versus post-Paleozoic communities"],
    mechanisms: ["volcanism, warming, anoxia, acidification, and ecological reset drive turnover"],
    misconception: "The end-Permian was just another dinosaur-related extinction.",
    correction:
      "The end-Permian predates dinosaurs' dominance and was the largest Phanerozoic ecosystem reset."
  },
  {
    number: "22",
    title: "Mesozoic Events and Mass Extinctions, Part 2",
    priority: "Very High",
    cluster: "Paleozoic-Mesozoic turnovers",
    sourcePath: "content/lectures/22/notes.md",
    role: "Continues Mesozoic restructuring through reptile diversification and the end-Cretaceous extinction.",
    goals: [
      "Understand Mesozoic reptile diversification.",
      "Know end-Cretaceous extinction evidence and causes.",
      "Use convergence and opportunistic takeover correctly."
    ],
    concepts: ["marine reptiles", "convergent evolution", "end-Cretaceous extinction"],
    evidence: ["reptile phylogenies", "iridium layer and Chicxulub crater", "extinction and recovery data"],
    mechanisms: ["impact winter and food-web collapse reset ecosystems and opened Cenozoic opportunity"],
    misconception: "The end-Cretaceous and end-Permian extinctions had the same main cause.",
    correction:
      "End-Cretaceous is strongly impact-linked, while end-Permian is tied to volcanism and cascading climate-ocean stress."
  },
  {
    number: "23",
    title: "Cenozoic Events",
    priority: "High",
    cluster: "Cenozoic-human impact",
    sourcePath: "content/lectures/23/notes.md",
    role: "Explains Cenozoic cooling, Pleistocene glaciation, and environmental context for mammals and humans.",
    goals: [
      "Know Cenozoic environmental change.",
      "Understand the Pleistocene Ice Age.",
      "Connect tectonics, CO2, ocean gateways, and orbital forcing."
    ],
    concepts: ["Cenozoic cooling", "Pleistocene Ice Age", "orbital forcing and feedbacks"],
    evidence: ["Zachos isotope curve", "CO2-temperature plots", "ice and sea-level records"],
    mechanisms: ["CO2 decline, tectonics, ocean gateways, and feedbacks drive greenhouse-to-icehouse change"],
    misconception: "Ice ages are caused by one simple drop in temperature.",
    correction:
      "Cenozoic and Pleistocene climate require orbital forcing, CO2, tectonics, oceans, and feedbacks."
  },
  {
    number: "24",
    title: "Mammal Evolution",
    priority: "Medium",
    cluster: "Cenozoic-human impact",
    sourcePath: "content/lectures/24/notes.md",
    role: "Frames mammal diversification through origin, extinction opportunity, chance, and climate.",
    goals: [
      "Understand Mesozoic mammal evolution.",
      "Understand Cenozoic mammal evolution.",
      "Separate chance, extinction, and climate effects."
    ],
    concepts: ["mammal diversification", "adaptive radiation", "Cenozoic habitat change"],
    evidence: ["mammal phylogenies", "fossil records", "climate-habitat timelines"],
    mechanisms: ["K-Pg ecological opportunity and Cenozoic climate change shaped diversification"],
    misconception: "Mammals first appeared only after dinosaurs went extinct.",
    correction:
      "Mammals originated earlier, but Cenozoic opportunity let them diversify into many roles."
  },
  {
    number: "25",
    title: "Human Evolution",
    priority: "Medium",
    cluster: "Cenozoic-human impact",
    sourcePath: "content/lectures/25/notes.md",
    role: "Places humans inside primate, hominin, and late Cenozoic environmental history.",
    goals: [
      "Know primate origins and traits.",
      "Understand divergence of the human lineage.",
      "Understand evolution of Homo."
    ],
    concepts: ["primate evolution", "hominin divergence", "Homo evolution"],
    evidence: ["hominin phylogenies", "skull and brain trends", "migration and interbreeding evidence"],
    mechanisms: ["environmental variability and adaptation shaped hominin and Homo evolution"],
    misconception: "Human evolution is a straight ladder from primitive to modern.",
    correction:
      "Human evolution is a branching tree with overlapping hominin lineages and environmental context."
  },
  {
    number: "26",
    title: "Human Impacts on Biological Communities",
    priority: "High",
    cluster: "Cenozoic-human impact",
    sourcePath: "content/lectures/26/notes.md",
    role: "Treats humans as ecological agents causing biodiversity and community change.",
    goals: [
      "Know major human impacts on biological communities.",
      "Understand mitigation strategies.",
      "Connect modern impacts to extinction and ecosystem engineering themes."
    ],
    concepts: ["overkill", "land use change", "introduced species"],
    evidence: ["extinction waves", "population trends", "invasive species case studies"],
    mechanisms: ["humans change communities through harvest, habitat change, introductions, and mitigation choices"],
    misconception: "Modern biodiversity loss is unrelated to deep-time extinction themes.",
    correction:
      "Modern biodiversity change reuses course themes of extinction, invasion, selectivity, and ecosystem engineering."
  },
  {
    number: "27",
    title: "Human Impacts on Climate",
    priority: "High",
    cluster: "Cenozoic-human impact",
    sourcePath: "content/lectures/27/notes.md",
    role: "Applies energy-budget, greenhouse, and carbon-cycle logic to industrial climate change.",
    goals: [
      "Understand industrial-era climate change.",
      "Know future climate-change logic.",
      "Know mitigation conceptually."
    ],
    concepts: ["anthropogenic greenhouse forcing", "fossil carbon", "climate mitigation"],
    evidence: ["CO2 and temperature curves", "emissions scenarios", "sea-level and ocean-acidification records"],
    mechanisms: ["fossil fuel burning transfers ancient buried carbon into the active atmosphere-ocean system"],
    misconception: "Modern climate change is separate from deep-time carbon-cycle history.",
    correction:
      "Modern climate change directly reverses ancient carbon burial and uses the same greenhouse-system logic."
  }
];

