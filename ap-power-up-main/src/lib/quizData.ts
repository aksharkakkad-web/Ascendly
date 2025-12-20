// AP Classes Quiz Data

export interface Question {
  question: string;
  options: string[];
  answer: string;
}

export interface ClassData {
  [unit: string]: Question[];
}

export interface AllClassesData {
  [className: string]: ClassData;
}

export const apClasses: AllClassesData = {
  "AP Biology": {
    "Unit 1": [
      {"question": "What is the primary structure of DNA?", "options": ["Double helix", "Single strand", "Alpha helix", "Beta sheet"], "answer": "Double helix"},
      {"question": "Which organelle is the site of cellular respiration?", "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"], "answer": "Mitochondria"},
      {"question": "What is the basic unit of life?", "options": ["Cell", "Atom", "Molecule", "Organ"], "answer": "Cell"}
    ],
    "Unit 2": [
      {"question": "Which process produces gametes?", "options": ["Mitosis", "Meiosis", "Binary fission", "Cytokinesis"], "answer": "Meiosis"},
      {"question": "What organelle contains genetic material?", "options": ["Nucleus", "Ribosome", "Lysosome", "Mitochondria"], "answer": "Nucleus"},
      {"question": "Which macromolecule stores genetic information?", "options": ["Protein", "Carbohydrate", "Nucleic acid", "Lipid"], "answer": "Nucleic acid"}
    ],
    "Unit 3": [
      {"question": "Which process converts glucose into energy?", "options": ["Photosynthesis", "Cellular respiration", "Fermentation", "Transcription"], "answer": "Cellular respiration"},
      {"question": "Which organelle makes proteins?", "options": ["Ribosome", "Golgi apparatus", "Mitochondria", "Nucleus"], "answer": "Ribosome"},
      {"question": "Which structure controls entry and exit of substances in a cell?", "options": ["Cell wall", "Cell membrane", "Cytoplasm", "Vacuole"], "answer": "Cell membrane"}
    ]
  },
  "AP Calculus AB": {
    "Unit 1": [
      {"question": "What does 'lim x->c f(x)' represent?", "options": ["Derivative", "Integral", "Limit", "Slope"], "answer": "Limit"},
      {"question": "What is the condition for a function to be continuous at a point?", "options": ["Limit exists", "Value is defined", "Limit equals value", "Graph is smooth"], "answer": "Limit equals value"},
      {"question": "A limit approaching infinity describes a?", "options": ["Hole", "Vertical Asymptote", "Jump", "Root"], "answer": "Vertical Asymptote"}
    ],
    "Unit 2": [
      {"question": "The derivative of a position function represents?", "options": ["Acceleration", "Velocity", "Distance", "Jerk"], "answer": "Velocity"},
      {"question": "What is the derivative of x^2?", "options": ["x", "2x", "2", "x^3"], "answer": "2x"},
      {"question": "Which rule is used to differentiate f(g(x))?", "options": ["Product Rule", "Chain Rule", "Quotient Rule", "Power Rule"], "answer": "Chain Rule"}
    ],
    "Unit 3": [
      {"question": "What theorem guarantees a value c where f'(c) equals the average rate of change?", "options": ["IVT", "MVT", "EVT", "Rolle's Theorem"], "answer": "MVT"},
      {"question": "Points where f'(x) = 0 or is undefined are called?", "options": ["Critical points", "Inflection points", "Roots", "Limits"], "answer": "Critical points"},
      {"question": "The second derivative test identifies?", "options": ["Roots", "Concavity/Extrema", "Continuity", "Limits"], "answer": "Concavity/Extrema"}
    ]
  },
  "AP Calculus BC": {
    "Unit 1": [
      {"question": "Which technique is often used for limits of the form 0/0?", "options": ["L'Hopital's Rule", "Integration by parts", "U-substitution", "Power Rule"], "answer": "L'Hopital's Rule"},
      {"question": "What is the derivative of arcsin(x)?", "options": ["1/sqrt(1-x^2)", "-1/sqrt(1-x^2)", "1/(1+x^2)", "cos(x)"], "answer": "1/sqrt(1-x^2)"},
      {"question": "Integration by parts is the reverse of which rule?", "options": ["Chain Rule", "Product Rule", "Quotient Rule", "Power Rule"], "answer": "Product Rule"}
    ],
    "Unit 2": [
      {"question": "What describes a curve using x(t) and y(t)?", "options": ["Parametric equations", "Polar coordinates", "Implicit functions", "Vector fields"], "answer": "Parametric equations"},
      {"question": "In polar coordinates, x is equal to?", "options": ["r sin(theta)", "r cos(theta)", "r tan(theta)", "r^2"], "answer": "r cos(theta)"},
      {"question": "The length of a vector curve is found using which formula?", "options": ["Area formula", "Arc length integral", "Volume integral", "Surface area"], "answer": "Arc length integral"}
    ],
    "Unit 3": [
      {"question": "Which series test compares terms to a known convergent integral?", "options": ["Ratio Test", "Integral Test", "Root Test", "Alternating Series Test"], "answer": "Integral Test"},
      {"question": "What is the Maclaurin series for e^x?", "options": ["Sum of x^n/n!", "Sum of (-1)^n x^n", "Sum of x^n", "Sum of n!x^n"], "answer": "Sum of x^n/n!"},
      {"question": "The radius of convergence is found using which test?", "options": ["Ratio Test", "P-series Test", "Comparison Test", "Divergence Test"], "answer": "Ratio Test"}
    ]
  },
  "AP Chemistry": {
    "Unit 1": [
      {"question": "What is the unit for the amount of substance?", "options": ["Gram", "Liter", "Mole", "Joule"], "answer": "Mole"},
      {"question": "Which law states mass is neither created nor destroyed?", "options": ["Conservation of Mass", "Ideal Gas Law", "Boyles Law", "Hess Law"], "answer": "Conservation of Mass"},
      {"question": "What is the trend for atomic radius across a period?", "options": ["Increases", "Decreases", "Stays same", "Fluctuates"], "answer": "Decreases"}
    ],
    "Unit 2": [
      {"question": "Which bond involves sharing electrons?", "options": ["Ionic", "Covalent", "Metallic", "Hydrogen"], "answer": "Covalent"},
      {"question": "VSEPR theory predicts?", "options": ["Reaction rate", "Molecular geometry", "Boiling point", "Solubility"], "answer": "Molecular geometry"},
      {"question": "What is the measure of an atom's ability to attract electrons?", "options": ["Ionization energy", "Electronegativity", "Electron affinity", "Shielding"], "answer": "Electronegativity"}
    ],
    "Unit 3": [
      {"question": "Which state of matter has indefinite shape and volume?", "options": ["Solid", "Liquid", "Gas", "Crystal"], "answer": "Gas"},
      {"question": "Intermolecular forces are strongest in?", "options": ["Solids", "Liquids", "Gases", "Plasmas"], "answer": "Solids"},
      {"question": "The Ideal Gas Law is expressed as?", "options": ["PV=nRT", "P1V1=P2V2", "V/T=k", "PT=P1+P2"], "answer": "PV=nRT"}
    ]
  },
  "AP Comparative Politics": {
    "Unit 1": [
      {"question": "Which term refers to a state's legitimate use of force?", "options": ["Sovereignty", "Autonomy", "Federalism", "Devolution"], "answer": "Sovereignty"},
      {"question": "What is a regime change?", "options": ["New president", "Complete change in system", "Policy shift", "New law"], "answer": "Complete change in system"},
      {"question": "Which is an indicator of a consolidated democracy?", "options": ["Frequent coups", "Peaceful transfer of power", "State media", "Banned protests"], "answer": "Peaceful transfer of power"}
    ],
    "Unit 2": [
      {"question": "In the UK, which body has the most power?", "options": ["House of Lords", "House of Commons", "Monarch", "Supreme Court"], "answer": "House of Commons"},
      {"question": "Russia's political system is best described as?", "options": ["Liberal democracy", "Illiberal democracy", "Theocracy", "Communist state"], "answer": "Illiberal democracy"},
      {"question": "China's primary decision-making body is the?", "options": ["Politburo Standing Committee", "National People's Congress", "State Council", "Military Commission"], "answer": "Politburo Standing Committee"}
    ],
    "Unit 3": [
      {"question": "Which country is a theocracy?", "options": ["Mexico", "Nigeria", "Iran", "Russia"], "answer": "Iran"},
      {"question": "Nigeria's greatest political challenge is?", "options": ["Monarchy", "Ethnic/Religious cleavage", "Lack of oil", "Too few parties"], "answer": "Ethnic/Religious cleavage"},
      {"question": "Mexico's PRI party held power for how long?", "options": ["4 years", "10 years", "71 years", "Forever"], "answer": "71 years"}
    ]
  },
  "AP Computer Science A": {
    "Unit 1": [
      {"question": "Which data type stores true or false?", "options": ["int", "double", "boolean", "String"], "answer": "boolean"},
      {"question": "What keyword is used to create a new object?", "options": ["create", "new", "make", "init"], "answer": "new"},
      {"question": "What is the operator for modulus (remainder)?", "options": ["/", "%", "*", "#"], "answer": "%"}
    ],
    "Unit 2": [
      {"question": "Which keyword refers to the current object?", "options": ["self", "me", "this", "super"], "answer": "this"},
      {"question": "A method that returns no value has the return type?", "options": ["null", "void", "zero", "empty"], "answer": "void"},
      {"question": "Which logical operator represents 'AND'?", "options": ["||", "&&", "!", "&"], "answer": "&&"}
    ],
    "Unit 3": [
      {"question": "Which loop is best when the number of iterations is known?", "options": ["while", "for", "do-while", "if"], "answer": "for"},
      {"question": "What is the index of the first element in an array?", "options": ["1", "0", "-1", "null"], "answer": "0"},
      {"question": "Inheritance is implemented using which keyword?", "options": ["implements", "extends", "inherits", "uses"], "answer": "extends"}
    ]
  },
  "AP Computer Science Principles": {
    "Unit 1": [
      {"question": "Which numbering system uses 0 and 1?", "options": ["Decimal", "Hexadecimal", "Binary", "Octal"], "answer": "Binary"},
      {"question": "What is a lossy compression?", "options": ["Perfect restoration", "Data lost for smaller size", "No data lost", "Increases file size"], "answer": "Data lost for smaller size"},
      {"question": "A byte consists of how many bits?", "options": ["4", "8", "16", "32"], "answer": "8"}
    ],
    "Unit 2": [
      {"question": "What is metadata?", "options": ["Data about data", "Big data", "Encrypted data", "Deleted data"], "answer": "Data about data"},
      {"question": "Which protocol assigns IP addresses?", "options": ["HTTP", "DNS", "DHCP", "SMTP"], "answer": "DHCP"},
      {"question": "The Internet is best described as?", "options": ["Centralized", "Distributed", "Private", "Temporary"], "answer": "Distributed"}
    ],
    "Unit 3": [
      {"question": "What is an algorithm?", "options": ["A computer bug", "Step-by-step instructions", "Hardware component", "Programming language"], "answer": "Step-by-step instructions"},
      {"question": "Phishing is an example of?", "options": ["Social engineering", "Encryption", "Coding", "Hardware failure"], "answer": "Social engineering"},
      {"question": "Which term describes the 'digital divide'?", "options": ["Screen size", "Access gap to technology", "Coding skill", "Internet speed"], "answer": "Access gap to technology"}
    ]
  },
  "AP English III: Language & Composition": {
    "Unit 1": [
      {"question": "Which appeal relies on credibility?", "options": ["Ethos", "Pathos", "Logos", "Kairos"], "answer": "Ethos"},
      {"question": "What is the central idea of a text called?", "options": ["Tone", "Thesis", "Diction", "Syntax"], "answer": "Thesis"},
      {"question": "Pathos appeals to the audience's?", "options": ["Logic", "Ethics", "Emotions", "Timing"], "answer": "Emotions"}
    ],
    "Unit 2": [
      {"question": "Diction refers to?", "options": ["Sentence structure", "Word choice", "Punctuation", "Theme"], "answer": "Word choice"},
      {"question": "Syntax refers to?", "options": ["Word meanings", "Sentence structure", "Paragraph length", "Vocabulary"], "answer": "Sentence structure"},
      {"question": "Which is a rhetorical device involving contrast?", "options": ["Antithesis", "Alliteration", "Metaphor", "Personification"], "answer": "Antithesis"}
    ],
    "Unit 3": [
      {"question": "What is a logical fallacy?", "options": ["A true statement", "A flaw in reasoning", "A complex sentence", "A citation style"], "answer": "A flaw in reasoning"},
      {"question": "Ad hominem attacks the?", "options": ["Argument", "Person", "Evidence", "Timing"], "answer": "Person"},
      {"question": "Synthesis involves?", "options": ["Summarizing one source", "Combining multiple sources", "Writing fiction", "Analyzing poems"], "answer": "Combining multiple sources"}
    ]
  },
  "AP English IV: Literature & Composition": {
    "Unit 1": [
      {"question": "What is the perspective from which a story is told?", "options": ["Setting", "Point of View", "Theme", "Tone"], "answer": "Point of View"},
      {"question": "Which character changes significantly in a story?", "options": ["Static", "Dynamic", "Flat", "Stock"], "answer": "Dynamic"},
      {"question": "The setting includes?", "options": ["Time and place", "Characters", "Dialogue", "Plot"], "answer": "Time and place"}
    ],
    "Unit 2": [
      {"question": "What is the structure of a Shakespearean sonnet?", "options": ["3 quatrains, 1 couplet", "Octave, sestet", "Free verse", "Haiku"], "answer": "3 quatrains, 1 couplet"},
      {"question": "Enjambment in poetry means?", "options": ["End-stopped lines", "Running over a line break", "Rhyming", "Stanza break"], "answer": "Running over a line break"},
      {"question": "A comparison without 'like' or 'as' is a?", "options": ["Simile", "Metaphor", "Hyperbole", "Symbol"], "answer": "Metaphor"}
    ],
    "Unit 3": [
      {"question": "Irony involving the audience knowing more than characters?", "options": ["Verbal", "Situational", "Dramatic", "Cosmic"], "answer": "Dramatic"},
      {"question": "A recurring symbol or motif creates?", "options": ["Theme", "Plot", "Setting", "Character"], "answer": "Theme"},
      {"question": "The emotional atmosphere of a work is its?", "options": ["Tone", "Mood", "Style", "Diction"], "answer": "Mood"}
    ]
  },
  "AP Environmental Science": {
    "Unit 1": [
      {"question": "What is an ecosystem?", "options": ["Only living things", "Living and nonliving interactions", "Only climate", "A single species"], "answer": "Living and nonliving interactions"},
      {"question": "Which cycle involves precipitation and evaporation?", "options": ["Carbon", "Nitrogen", "Water", "Phosphorus"], "answer": "Water"},
      {"question": "What is the primary source of energy for Earth?", "options": ["Geothermal", "The Sun", "Wind", "Fossil fuels"], "answer": "The Sun"}
    ],
    "Unit 2": [
      {"question": "What is biodiversity?", "options": ["Variety of life", "Number of rocks", "Water quality", "Soil depth"], "answer": "Variety of life"},
      {"question": "A keystone species has a?", "options": ["Small impact", "Disproportionately large impact", "No impact", "Negative impact"], "answer": "Disproportionately large impact"},
      {"question": "Succession beginning on bare rock is?", "options": ["Primary", "Secondary", "Tertiary", "Aquatic"], "answer": "Primary"}
    ],
    "Unit 3": [
      {"question": "What is the human population trend?", "options": ["Decreasing", "Exponential growth", "Stable", "Zero growth"], "answer": "Exponential growth"},
      {"question": "Which is a fossil fuel?", "options": ["Solar", "Coal", "Wind", "Hydro"], "answer": "Coal"},
      {"question": "The greenhouse effect causes?", "options": ["Cooling", "Warming", "Rain", "Wind"], "answer": "Warming"}
    ]
  },
  "AP Macroeconomics": {
    "Unit 1": [
      {"question": "Scarcity means?", "options": ["Unlimited resources", "Limited resources, unlimited wants", "High prices", "No demand"], "answer": "Limited resources, unlimited wants"},
      {"question": "Opportunity cost is?", "options": ["Price paid", "Next best alternative forgone", "Total cost", "Profit"], "answer": "Next best alternative forgone"},
      {"question": "The PPC curve shows?", "options": ["Prices", "Production possibilities", "Demand", "Supply"], "answer": "Production possibilities"}
    ],
    "Unit 2": [
      {"question": "GDP measures?", "options": ["Total production", "Happiness", "Population", "Stock market"], "answer": "Total production"},
      {"question": "Inflation is an increase in?", "options": ["Production", "Unemployment", "Price level", "Wages"], "answer": "Price level"},
      {"question": "Frictional unemployment is due to?", "options": ["Recession", "Job switching", "Technology", "Seasons"], "answer": "Job switching"}
    ],
    "Unit 3": [
      {"question": "Aggregate Demand includes?", "options": ["C+I+G+Xn", "Imports only", "Savings", "Taxes"], "answer": "C+I+G+Xn"},
      {"question": "Fiscal policy is conducted by?", "options": ["Central Bank", "Government/Congress", "Corporations", "Consumers"], "answer": "Government/Congress"},
      {"question": "The MPC is the marginal propensity to?", "options": ["Save", "Consume", "Invest", "Tax"], "answer": "Consume"}
    ]
  },
  "AP Microeconomics": {
    "Unit 1": [
      {"question": "Law of Demand states price and quantity are?", "options": ["Directly related", "Inversely related", "Unrelated", "Equal"], "answer": "Inversely related"},
      {"question": "Equilibrium is where?", "options": ["Supply > Demand", "Demand > Supply", "Supply equals Demand", "Price is zero"], "answer": "Supply equals Demand"},
      {"question": "A price ceiling creates a?", "options": ["Surplus", "Shortage", "Equilibrium", "Profit"], "answer": "Shortage"}
    ],
    "Unit 2": [
      {"question": "Elasticity measures?", "options": ["Profit", "Responsiveness", "Total revenue", "Cost"], "answer": "Responsiveness"},
      {"question": "Cross-price elasticity for substitutes is?", "options": ["Positive", "Negative", "Zero", "Undefined"], "answer": "Positive"},
      {"question": "Consumer surplus is area?", "options": ["Below demand, above price", "Above supply, below price", "Below supply", "Above demand"], "answer": "Below demand, above price"}
    ],
    "Unit 3": [
      {"question": "Marginal Cost is the cost of?", "options": ["Total output", "One additional unit", "Fixed inputs", "Variable inputs"], "answer": "One additional unit"},
      {"question": "Perfect competition has?", "options": ["One firm", "Few firms", "Many firms, identical products", "Different products"], "answer": "Many firms, identical products"},
      {"question": "Profit maximization rule is?", "options": ["MR=MC", "P=ATC", "TR=TC", "MR=0"], "answer": "MR=MC"}
    ]
  },
  "AP Physics 1: Algebra-Based": {
    "Unit 1": [
      {"question": "Velocity is a vector, meaning it has?", "options": ["Magnitude only", "Direction only", "Magnitude and direction", "Neither"], "answer": "Magnitude and direction"},
      {"question": "Slope of a position-time graph is?", "options": ["Acceleration", "Velocity", "Displacement", "Force"], "answer": "Velocity"},
      {"question": "Acceleration due to gravity is approx?", "options": ["9.8 m/s^2", "15 m/s^2", "5 m/s^2", "0 m/s^2"], "answer": "9.8 m/s^2"}
    ],
    "Unit 2": [
      {"question": "Newton's Second Law is?", "options": ["F=ma", "F=mv", "F=m/a", "F=0"], "answer": "F=ma"},
      {"question": "Friction always acts?", "options": ["In direction of motion", "Opposite to motion", "Perpendicular to surface", "Downwards"], "answer": "Opposite to motion"},
      {"question": "Inertia is a measure of?", "options": ["Velocity", "Mass", "Force", "Acceleration"], "answer": "Mass"}
    ],
    "Unit 3": [
      {"question": "Work is defined as?", "options": ["Force x Time", "Force x Distance", "Mass x Velocity", "Power x Time"], "answer": "Force x Distance"},
      {"question": "Kinetic Energy depends on?", "options": ["Height", "Speed", "Time", "Gravity"], "answer": "Speed"},
      {"question": "Conservation of Energy means energy?", "options": ["Is destroyed", "Is created", "Changes form but total is constant", "Increases"], "answer": "Changes form but total is constant"}
    ]
  },
  "AP Physics 2: Algebra-Based": {
    "Unit 1": [
      {"question": "Density is defined as?", "options": ["Mass/Volume", "Volume/Mass", "Mass x Volume", "Weight/Area"], "answer": "Mass/Volume"},
      {"question": "Buoyant force is equal to weight of?", "options": ["Object", "Displaced fluid", "Container", "Air"], "answer": "Displaced fluid"},
      {"question": "Pressure in a fluid increases with?", "options": ["Depth", "Surface area", "Volume", "Width"], "answer": "Depth"}
    ],
    "Unit 2": [
      {"question": "The First Law of Thermodynamics is conservation of?", "options": ["Mass", "Energy", "Momentum", "Charge"], "answer": "Energy"},
      {"question": "Entropy represents?", "options": ["Heat", "Disorder", "Work", "Pressure"], "answer": "Disorder"},
      {"question": "PV diagrams show work as the?", "options": ["Slope", "Area under curve", "Intercept", "Height"], "answer": "Area under curve"}
    ],
    "Unit 3": [
      {"question": "Like charges?", "options": ["Attract", "Repel", "Do nothing", "Spin"], "answer": "Repel"},
      {"question": "Capacitors store?", "options": ["Current", "Electric potential energy", "Magnetic fields", "Heat"], "answer": "Electric potential energy"},
      {"question": "Kirchhoff's Junction Rule is conservation of?", "options": ["Energy", "Charge", "Voltage", "Mass"], "answer": "Charge"}
    ]
  },
  "AP Physics C": {
    "Unit 1": [
      {"question": "Rotational analog of mass?", "options": ["Torque", "Moment of Inertia", "Angular Velocity", "Angular Momentum"], "answer": "Moment of Inertia"},
      {"question": "Torque is defined as?", "options": ["r x F", "F / r", "m x v", "1/2 mv^2"], "answer": "r x F"},
      {"question": "Which force provides centripetal acceleration in orbit?", "options": ["Gravity", "Friction", "Tension", "Normal"], "answer": "Gravity"}
    ],
    "Unit 2": [
      {"question": "Electric field is the gradient of?", "options": ["Force", "Potential (Voltage)", "Charge", "Current"], "answer": "Potential (Voltage)"},
      {"question": "Gauss's Law relates flux to?", "options": ["Enclosed charge", "External charge", "Current", "Resistance"], "answer": "Enclosed charge"},
      {"question": "Inductance opposes change in?", "options": ["Voltage", "Current", "Charge", "Capacitance"], "answer": "Current"}
    ],
    "Unit 3": [
      {"question": "Maxwell's Equations describe?", "options": ["Gravity", "Electromagnetism", "Thermodynamics", "Fluids"], "answer": "Electromagnetism"},
      {"question": "Magnetic force on a moving charge is?", "options": ["qvB", "qE", "IR", "ma"], "answer": "qvB"},
      {"question": "Biot-Savart Law calculates?", "options": ["Electric field", "Magnetic field", "Force", "Flux"], "answer": "Magnetic field"}
    ]
  },
  "AP Pre-Calculus": {
    "Unit 1": [
      {"question": "A polynomial's end behavior is determined by?", "options": ["Constant term", "Leading term", "Middle term", "Y-intercept"], "answer": "Leading term"},
      {"question": "What is a zero of a function?", "options": ["Input where output is 0", "Y-intercept", "Vertex", "Asymptote"], "answer": "Input where output is 0"},
      {"question": "Rational functions may have?", "options": ["Sharp corners", "Asymptotes", "No domain", "Constant slope"], "answer": "Asymptotes"}
    ],
    "Unit 2": [
      {"question": "Exponential functions grow by?", "options": ["Adding a constant", "Multiplying by a constant", "Squaring", "Dividing"], "answer": "Multiplying by a constant"},
      {"question": "Logarithms are inverses of?", "options": ["Linear functions", "Exponential functions", "Trig functions", "Polynomials"], "answer": "Exponential functions"},
      {"question": "log(xy) equals?", "options": ["log(x) + log(y)", "log(x) - log(y)", "log(x) * log(y)", "x log(y)"], "answer": "log(x) + log(y)"}
    ],
    "Unit 3": [
      {"question": "The period of sin(x) is?", "options": ["pi", "2pi", "pi/2", "4pi"], "answer": "2pi"},
      {"question": "Which function oscillates between -1 and 1?", "options": ["tan(x)", "sin(x)", "e^x", "x^2"], "answer": "sin(x)"},
      {"question": "Pythagorean identity states sin^2 + cos^2 = ?", "options": ["0", "1", "tan^2", "-1"], "answer": "1"}
    ]
  },
  "AP Psychology": {
    "Unit 1": [
      {"question": "Who is the father of psychoanalysis?", "options": ["Freud", "Skinner", "Watson", "Pavlov"], "answer": "Freud"},
      {"question": "Which variable is manipulated in an experiment?", "options": ["Dependent", "Independent", "Confounding", "Control"], "answer": "Independent"},
      {"question": "What connects the two brain hemispheres?", "options": ["Cerebellum", "Corpus Callosum", "Amygdala", "Thalamus"], "answer": "Corpus Callosum"}
    ],
    "Unit 2": [
      {"question": "Which lobe processes vision?", "options": ["Frontal", "Occipital", "Temporal", "Parietal"], "answer": "Occipital"},
      {"question": "What is the gap between neurons?", "options": ["Axon", "Synapse", "Dendrite", "Soma"], "answer": "Synapse"},
      {"question": "Neuroplasticity refers to the brain's ability to?", "options": ["Grow size", "Change and adapt", "Create energy", "Stop thinking"], "answer": "Change and adapt"}
    ],
    "Unit 3": [
      {"question": "Operant conditioning involves?", "options": ["Reflexes", "Rewards and punishments", "Observation", "Genetics"], "answer": "Rewards and punishments"},
      {"question": "Short-term memory capacity is approx?", "options": ["7 items", "100 items", "Unlimited", "2 items"], "answer": "7 items"},
      {"question": "Jean Piaget studied?", "options": ["Social norms", "Cognitive development", "Digestion", "Sleep"], "answer": "Cognitive development"}
    ]
  },
  "AP Statistics": {
    "Unit 1": [
      {"question": "Which graph displays quantitative data?", "options": ["Bar chart", "Histogram", "Pie chart", "Venn diagram"], "answer": "Histogram"},
      {"question": "The median is resistant to?", "options": ["Outliers", "Sample size", "Center", "Spread"], "answer": "Outliers"},
      {"question": "Z-score measures?", "options": ["Standard deviations from mean", "Total value", "Probability", "Error"], "answer": "Standard deviations from mean"}
    ],
    "Unit 2": [
      {"question": "Correlation (r) ranges between?", "options": ["0 and 1", "-1 and 1", "-10 and 10", "0 and 100"], "answer": "-1 and 1"},
      {"question": "LSRL stands for?", "options": ["Least Squares Regression Line", "Line of Standard Regression", "Low Standard Rate Line", "Linear Stat Rate Line"], "answer": "Least Squares Regression Line"},
      {"question": "Residual is calculated as?", "options": ["Observed - Predicted", "Predicted - Observed", "Mean - Median", "X - Y"], "answer": "Observed - Predicted"}
    ],
    "Unit 3": [
      {"question": "A simple random sample ensures?", "options": ["Equal chance of selection", "Convenience", "Voluntary response", "Stratification"], "answer": "Equal chance of selection"},
      {"question": "Which event probability is impossible?", "options": ["0", "0.5", "1", "1.5"], "answer": "1.5"},
      {"question": "Central Limit Theorem relates to?", "options": ["Sample means", "Medians", "Outliers", "Errors"], "answer": "Sample means"}
    ]
  },
  "AP US History": {
    "Unit 1": [
      {"question": "The Columbian Exchange involved transfer of?", "options": ["Money", "Plants, animals, diseases", "Technology only", "Land"], "answer": "Plants, animals, diseases"},
      {"question": "Which colony was founded by Puritans?", "options": ["Virginia", "Massachusetts Bay", "Georgia", "New York"], "answer": "Massachusetts Bay"},
      {"question": "Cash crop of Jamestown?", "options": ["Cotton", "Tobacco", "Corn", "Rice"], "answer": "Tobacco"}
    ],
    "Unit 2": [
      {"question": "Which war ended with the Treaty of Paris 1763?", "options": ["Revolutionary War", "French and Indian War", "Civil War", "War of 1812"], "answer": "French and Indian War"},
      {"question": "Common Sense was written by?", "options": ["Jefferson", "Paine", "Washington", "Hamilton"], "answer": "Paine"},
      {"question": "The Articles of Confederation lacked?", "options": ["Power to tax", "A name", "States", "Land"], "answer": "Power to tax"}
    ],
    "Unit 3": [
      {"question": "Manifest Destiny is the belief in?", "options": ["Isolationism", "Westward expansion", "Slavery", "Industrialization"], "answer": "Westward expansion"},
      {"question": "The Emancipation Proclamation freed slaves in?", "options": ["All states", "Reelling states", "Border states", "North only"], "answer": "Reelling states"},
      {"question": "Reconstruction ended with the?", "options": ["Compromise of 1877", "Civil War", "13th Amendment", "Lincoln's death"], "answer": "Compromise of 1877"}
    ]
  },
  "AP World History": {
    "Unit 1": [
      {"question": "The Silk Road connected?", "options": ["Europe and Americas", "China and Europe/Middle East", "Africa and Asia", "North and South America"], "answer": "China and Europe/Middle East"},
      {"question": "Which religion spread via the Silk Road?", "options": ["Buddhism", "Hinduism", "Shinto", "Animism"], "answer": "Buddhism"},
      {"question": "The Caliphate refers to which empire type?", "options": ["Islamic", "Christian", "Buddhist", "Roman"], "answer": "Islamic"}
    ],
    "Unit 2": [
      {"question": "The Mongols were known for?", "options": ["Navy", "Horseback warfare", "Agriculture", "Isolation"], "answer": "Horseback warfare"},
      {"question": "Which plague devastated Afro-Eurasia?", "options": ["Black Death", "Smallpox", "Flu", "Cholera"], "answer": "Black Death"},
      {"question": "Mansa Musa was the ruler of?", "options": ["Mali", "Ghana", "Songhai", "Kongo"], "answer": "Mali"}
    ],
    "Unit 3": [
      {"question": "The Columbian Exchange followed whose voyages?", "options": ["Columbus", "Zheng He", "Da Gama", "Cook"], "answer": "Columbus"},
      {"question": "Which empire used the Devshirme system?", "options": ["Ottoman", "Mughal", "Safavid", "Russian"], "answer": "Ottoman"},
      {"question": "Martin Luther initiated the?", "options": ["Renaissance", "Protestant Reformation", "Crusades", "Enlightenment"], "answer": "Protestant Reformation"}
    ]
  }
};

// Custom questions storage key
const CUSTOM_QUESTIONS_KEY = 'ascendly_custom_questions';

// Get custom questions from localStorage
const getCustomQuestions = (): AllClassesData => {
  const stored = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
  return stored ? JSON.parse(stored) : {};
};

// Save custom questions to localStorage
const saveCustomQuestions = (questions: AllClassesData): void => {
  localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(questions));
};

// Add a custom question to a class/unit
export const addCustomQuestion = (className: string, unit: string, question: Question): void => {
  const custom = getCustomQuestions();
  if (!custom[className]) custom[className] = {};
  if (!custom[className][unit]) custom[className][unit] = [];
  custom[className][unit].push(question);
  saveCustomQuestions(custom);
};

export const getClassNames = (): string[] => Object.keys(apClasses);

export const getUnitsForClass = (className: string): string[] => {
  const classData = apClasses[className];
  return classData ? Object.keys(classData) : [];
};

export const getQuestionsForUnit = (className: string, unit: string): Question[] => {
  const classData = apClasses[className];
  const builtIn = classData ? (classData[unit] || []) : [];
  const custom = getCustomQuestions();
  const customForUnit = custom[className]?.[unit] || [];
  return [...builtIn, ...customForUnit];
};
