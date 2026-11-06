window.PROFILE = {
  name: "Dev Bansal",
  deviceName: "Dev Bansal",
  headline: "I turn research ideas into shipped features.",
  intro: "I'm 19, studying computer science and data science at UPES. I intern at Ocally as an ML and AI engineer, building evals and research agents, and I make computer vision projects on the side.",
  status: "ML and AI engineer intern at Ocally.",
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/devbansal08/" },
    { label: "X", href: "https://x.com/sharpeye_wnl" },
    { label: "GitHub", href: "https://github.com/sharpeye08" }
  ]
};

window.CARTRIDGES = [
  {
    id: "about",
    label: "About me",
    color: "#f1e9dc",
    ink: "#1d1a24",
    icon: "avatar",
    type: "dialog",
    speaker: "Dev",
    lines: [
      "Hi, I'm Dev Bansal. I study CS and Data Science at UPES in Dehradun.",
      "I intern at Ocally as an ML and AI engineer, building evals and research agents.",
      "On the side I rebuild papers from scratch, like YOLOv1, and build computer vision projects like anzen.",
      "I work with Python, PyTorch, LangGraph and OpenCV. Pick another cartridge to see more."
    ]
  },
  {
    id: "work",
    label: "Work",
    color: "#c3b1f0",
    ink: "#1d1a24",
    icon: "work",
    type: "timeline",
    title: "Work",
    items: [
      {
        role: "ML / AI Engineer Intern",
        org: "Ocally Inc.",
        where: "Remote",
        when: "June 2026 to now",
        points: [
          "Built the eval suite for a 19-agent research pipeline.",
          "Made it a self-contained evals/ module that leaves existing code alone.",
          "Built research agents and modeled POS sales data from Clover and Square."
        ]
      },
      {
        role: "Growth",
        org: "Code Help",
        where: "Remote",
        when: "Dec 2025 to June 2026",
        points: [
          "Helped launch CodeHelp One across engineering and marketing.",
          "Ran Twitter growth and creator outreach campaigns."
        ]
      },
      {
        role: "B.Tech, Computer Science and Data Science",
        org: "UPES",
        where: "Dehradun",
        when: "2024 to 2028",
        points: []
      }
    ]
  },
  {
    id: "projects",
    label: "Projects",
    color: "#f2b544",
    ink: "#1d1a24",
    icon: "projects",
    type: "library",
    title: "Projects",
    items: [
      {
        group: "Built",
        tag: "Vision",
        icon: "anzen",
        kicker: "a road-safety detector",
        title: "anzen",
        blurb: "Road-safety detection and alert system.",
        status: "Built Mar 2026",
        stack: "Python, YOLOv8, OpenCV, Ultralytics",
        points: [
          "Runs YOLOv8 on traffic images and fires HIGH, MEDIUM or LOW alerts.",
          "Alert rules live in a table, so new rules need no inference changes.",
          "Detection, alerting and I/O are separate modules."
        ],
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/anzen-" }]
      },
      {
        group: "Built",
        tag: "Agents",
        icon: "kenkyu",
        kicker: "an AI research agent",
        title: "kenkyū",
        blurb: "An autonomous research agent that writes cited reports.",
        status: "Built Feb 2026",
        stack: "Python, LangGraph, LangChain, Ollama, Tavily",
        points: [
          "A LangGraph flow: Planner, Researcher, then Generator writes a cited report.",
          "Llama 3 runs locally on Ollama, so prompts stay off third-party servers.",
          "Tavily supplies real-time web search."
        ],
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/kenkyu" }]
      },
      {
        group: "Built",
        tag: "AutoML",
        icon: "sharpner",
        kicker: "a no-code AutoML tool",
        title: "Sharpner",
        blurb: "Train and compare ML models in your browser.",
        status: "Deployed",
        when: "August 2025",
        stack: "Python, scikit-learn, Streamlit",
        points: [
          "Takes a CSV and a target column, then detects classification or regression.",
          "Trains and compares scikit-learn models in one click.",
          "Shows metric tables, trend charts and confusion matrices."
        ],
        links: [
          { label: "Open the app", href: "https://sharpner.streamlit.app/" },
          { label: "Source on GitHub", href: "https://github.com/sharpeye08/Sharpner" }
        ]
      },
      {
        group: "Lab",
        tag: "Paper",
        icon: "lab",
        kicker: "a paper, rebuilt",
        title: "YOLOv1 from scratch",
        blurb: "YOLOv1 (Redmon et al., 2015), built straight from the paper.",
        status: "Paper reimplementation",
        when: "March 2026",
        stack: "Python, PyTorch",
        points: [
          "24 convolutional layers and 2 fully connected layers.",
          "448×448 input and a 7×7×30 output grid.",
          "Two boxes and 20 class scores for every grid cell."
        ],
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/YOLOv1-Paper-Implementation-" }]
      },
      {
        group: "Lab",
        tag: "Study",
        icon: "lab",
        kicker: "a fine-tuning study",
        title: "ResNet-18 transfer learning",
        blurb: "Three ways to fine-tune ResNet-18 on CIFAR-10, compared.",
        status: "77.2% test accuracy",
        when: "March 2026",
        stack: "Python, PyTorch, torchvision",
        points: [
          "Feature extraction (~5K trainable parameters), partial (~10.5M) and full fine-tuning (11.2M).",
          "Feature extraction reached 77.2% test accuracy.",
          "Differential learning rates, gradient clipping and best-checkpoint selection."
        ],
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/ResNet18-transfer-learning-on-CIFAR-10" }]
      },
      {
        group: "Lab",
        tag: "Framework",
        icon: "lab",
        kicker: "a framework from scratch",
        title: "teenygrad",
        blurb: "A tiny deep learning framework: autograd, tensors and layers.",
        status: "From scratch",
        stack: "Python, NumPy",
        points: [
          "An autograd engine with a small tensor API.",
          "Neural network layers built on top of it.",
          "Trained on toy digits."
        ],
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/build-your-own-teenygrad-a-tiny-tensor-autograd-engine" }]
      },
      {
        group: "Lab",
        tag: "Paper",
        icon: "lab",
        kicker: "a classic, reimplemented",
        title: "AlexNet",
        blurb: "The AlexNet architecture, implemented.",
        status: "Implementation",
        stack: "Python",
        details: "An implementation of the AlexNet architecture.",
        links: [{ label: "Source on GitHub", href: "https://github.com/sharpeye08/AlexNet-implementation" }]
      }
    ]
  },
  {
    id: "blog",
    label: "Blog",
    color: "#79bff0",
    ink: "#1d1a24",
    icon: "blog",
    type: "gallery",
    title: "Blog",
    items: [
      {
        title: "Building the brain logic of AI agents",
        kind: "A beginner's guide",
        by: "On X, January 2026",
        summary: "How AI agent logic works, and how to build it. Reposted by the founder of LangChain.",
        href: "https://x.com/sharpeye_wnl/status/2017110571460784451"
      }
    ]
  },
  {
    id: "activity",
    label: "Activity",
    color: "#ec8fb2",
    ink: "#1d1a24",
    icon: "activity",
    type: "activity",
    user: "sharpeye08",
    href: "https://github.com/sharpeye08",
    title: "GitHub activity"
  },
  {
    id: "contact",
    label: "Contact",
    color: "#f6a77a",
    ink: "#1d1a24",
    icon: "mail",
    type: "contact",
    title: "Say hello",
    email: "devb6646@gmail.com",
    items: [
      { label: "LinkedIn", handle: "devbansal08", href: "https://www.linkedin.com/in/devbansal08/" },
      { label: "X", handle: "@sharpeye_wnl", href: "https://x.com/sharpeye_wnl" },
      { label: "GitHub", handle: "sharpeye08", href: "https://github.com/sharpeye08" }
    ]
  }
];
