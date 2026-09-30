/*
 * Unity Quiz — content & brand data.
 *
 * Two classes, each with its own question pool (Unity Weeks 1–2).
 * Class A and Class B share no questions. Edit this file to add or change
 * questions; no build step is needed.
 */
window.QUIZ = window.QUIZ || {};

/*
 * Header colours. One is picked at random each turn.
 * `onColor` is the text colour on top of `headerBg`, chosen for WCAG AA contrast:
 * dark ink on the light colours, white on the dark ones.
 */
window.QUIZ.PALETTE = [
  {
    name: "Play Blue",
    headerBg: "#1F6FEB",
    accentBg: "rgba(31, 111, 235, 0.12)",
    accentText: "#1A5CC4",
    btnColor: "#1F6FEB",
    borderColor: "#1A5CC4",
    onColor: "#FFFFFF"
  },
  {
    name: "Shader Violet",
    headerBg: "#7C3AED",
    accentBg: "rgba(124, 58, 237, 0.12)",
    accentText: "#6D28D9",
    btnColor: "#7C3AED",
    borderColor: "#6D28D9",
    onColor: "#FFFFFF"
  },
  {
    name: "Gizmo Green",
    headerBg: "#22C55E",
    accentBg: "rgba(34, 197, 94, 0.13)",
    accentText: "#15803D",
    btnColor: "#22C55E",
    borderColor: "#16A34A",
    onColor: "#052E16"
  },
  {
    name: "Console Amber",
    headerBg: "#F59E0B",
    accentBg: "rgba(245, 158, 11, 0.15)",
    accentText: "#B45309",
    btnColor: "#F59E0B",
    borderColor: "#D97706",
    onColor: "#2A1800"
  },
  {
    name: "Prefab Pink",
    headerBg: "#DB2777",
    accentBg: "rgba(219, 39, 119, 0.12)",
    accentText: "#BE185D",
    btnColor: "#DB2777",
    borderColor: "#BE185D",
    onColor: "#FFFFFF"
  },
  {
    name: "Scene Teal",
    headerBg: "#14B8A6",
    accentBg: "rgba(20, 184, 166, 0.13)",
    accentText: "#0F766E",
    btnColor: "#14B8A6",
    borderColor: "#0D9488",
    onColor: "#042F2E"
  }
];

/*
 * Question schema:
 *   id           unique string (used by the no-repeat shuffle bag)
 *   type         "mcq" (4 options, shuffled each turn) or "tf" (True / False, fixed order)
 *   topic        label shown as a chip — never a number
 *   question     question text (for "tf", the statement to judge)
 *   options      mcq: exactly 4 answers; tf: filled in automatically
 *   correctIndex index into `options` of the right answer
 *   explanation  shown on the result screen
 *   image        optional screenshot file name inside assets/img/questions/
 *   imageNote    what the screenshot should show (for the teacher; never displayed)
 */
(() => {
  const T = {
    concepts: "Game Concepts",
    setup: "Setup & Tools",
    ui: "Unity Interface",
    objects: "GameObjects & Components",
    prefabs: "Prefabs",
    materials: "Textures & Materials",
    git: "Project Structure & Git"
  };
  const LETTER = { A: 0, B: 1, C: 2, D: 3 };

  const mcq = (id, topic, question, options, answer, explanation, image, imageNote) => ({
    id, type: "mcq", topic, question, options, correctIndex: LETTER[answer], explanation, image, imageNote
  });
  const tf = (id, topic, question, answer, explanation, image, imageNote) => ({
    id, type: "tf", topic, question, options: ["True", "False"], correctIndex: answer ? 0 : 1, explanation, image, imageNote
  });

  const CLASS_A = [
    mcq("a01", T.concepts, "What genre is this game?",
      ["Platformer", "RTS", "Racing", "Puzzle"], "A",
      "A platformer is about running and jumping between platforms, like classic Mario side-scrollers.",
      "a01.png", "Mario-style side-scroller"),
    mcq("a02", T.concepts, "What type of immersive content is this?",
      ["AR", "VR", "MR", "2D"], "B",
      "Virtual Reality (VR) puts the player fully inside a virtual world through a headset.",
      "a02.png", "Person wearing a headset, fully inside a virtual room"),
    mcq("a03", T.setup, "What is the name of this app?",
      ["Unity Editor", "Unity Hub", "Visual Studio", "GitHub Desktop"], "B",
      "Unity Hub manages your Unity versions (installs) and projects. You open the Editor from it.",
      "a03.png", "Unity Hub window"),
    mcq("a04", T.setup, "What does this line do?",
      ["Creates an object", "Prints a message to the Console", "Plays a sound", "Saves the scene"], "B",
      "Debug.Log(\"Hello World\"); prints the text to the Console window. It is the quickest way to check your code runs.",
      "a04.png", "Script with Debug.Log(\"Hello World\"); highlighted"),
    mcq("a05", T.setup, "What is this red dot called?",
      ["Error", "Breakpoint", "Bookmark", "Warning"], "B",
      "A breakpoint pauses the code on that line while debugging, so you can inspect values step by step.",
      "a05.png", "Red dot in the Visual Studio margin"),
    mcq("a06", T.ui, "Which window is this?",
      ["Project", "Hierarchy", "Inspector", "Console"], "B",
      "The Hierarchy lists every GameObject in the open scene, such as Main Camera and Directional Light.",
      "a06.png", "Left panel listing Main Camera and Directional Light, red box"),
    mcq("a07", T.ui, "Which window is this?",
      ["Console", "Project", "Inspector", "Game"], "C",
      "The Inspector shows the Transform and every other component of the selected object, and lets you edit them.",
      "a07.png", "Right panel showing Transform and components, red box"),
    mcq("a08", T.ui, "What does this button do?",
      ["Builds the game", "Enters Play Mode", "Saves", "Imports assets"], "B",
      "The Play button runs the game inside the Editor (Play Mode). Press it again to stop.",
      "a08.png", "Play button highlighted"),
    mcq("a09", T.objects, "Which component is this?",
      ["Rigidbody", "Transform", "Collider", "Renderer"], "B",
      "Every GameObject has a Transform: its Position, Rotation and Scale.",
      "a09.png", "Inspector showing Position / Rotation / Scale"),
    mcq("a10", T.objects, "What does this component add to an object?",
      ["Color", "Physics", "Sound", "Script"], "B",
      "A Rigidbody puts the object under the physics engine: mass, gravity, forces and collisions.",
      "a10.png", "Rigidbody component with Mass and Use Gravity fields"),
    mcq("a11", T.prefabs, "What is this object?",
      ["Material", "Prefab instance", "Script", "Scene"], "B",
      "A blue cube icon in the Hierarchy marks a prefab instance: a copy linked to a prefab asset.",
      "a11.png", "Blue cube icon next to an object in the Hierarchy"),
    mcq("a12", T.materials, "What type of asset is this?",
      ["Material", "Texture", "Shader", "Mesh"], "B",
      "A flat image file such as brick.png is a texture. A material uses textures to colour a surface.",
      "a12.png", "brick.png flat image file in the Project window"),
    mcq("a13", T.materials, "What does Albedo control?",
      ["Bumps", "Base color", "Shine", "Glow"], "B",
      "Albedo is the base colour (or base texture) of a material. Bumps come from the Normal map, glow from Emission.",
      "a13.png", "Material Inspector with the Albedo slot highlighted"),
    mcq("a14", T.git, "What practice does this show?",
      ["Random storage", "Organised folder structure", "Git ignore", "Build folder"], "B",
      "Keeping Scripts, Materials, Prefabs, Scenes and Textures in their own folders makes a project easy to navigate.",
      "a14.png", "Assets folder with Scripts, Materials, Prefabs, Scenes, Textures folders"),
    mcq("a15", T.git, "Which Git command uses this URL to copy the project to your computer?",
      ["push", "commit", "clone", "merge"], "C",
      "git clone <url> downloads a full copy of the repository, including its history.",
      "a15.png", "GitHub green \"Code\" button showing an HTTPS URL"),
    mcq("a16", T.git, "What does this command do?",
      ["Sends commits to GitHub", "Downloads files", "Undoes changes", "Stages files"], "A",
      "git push uploads your local commits to the remote repository on GitHub.",
      "a16.png", "Terminal showing git push"),
    tf("a17", T.ui, "This is the Game view.", false,
      "False. Gizmos and a grid mean this is the Scene view. The Game view shows only what the camera sees.",
      "a17.png", "Scene view with gizmos and grid"),
    tf("a18", T.prefabs, "This object is linked to a prefab.", true,
      "True. The blue cube icon shows a prefab instance, so it is linked to its prefab asset.",
      "a18.png", "Blue cube icon in the Hierarchy"),
    tf("a19", T.ui, "Changes made in Play Mode are saved automatically.", false,
      "False. Changes made in Play Mode are lost when you stop. Stop Play Mode before editing."),
    tf("a20", T.concepts, "This game is fully 2D.", false,
      "False. It uses 3D graphics with a side-locked camera. That is 2.5D.",
      "a20.png", "2.5D side-scroller, 3D graphics with a side-locked camera"),
    tf("a21", T.git, "The Library folder should be pushed to GitHub.", false,
      "False. Library is generated by Unity on each computer, so it belongs in .gitignore."),
    tf("a22", T.objects, "Adding this component makes the object affected by gravity.", true,
      "True. A Rigidbody with Use Gravity ticked (the default) falls under gravity.",
      "a22.png", "Rigidbody component"),
    tf("a23", T.ui, "The Inspector shows the components of the selected object.", true,
      "True. Select an object in the Hierarchy or Scene and the Inspector lists its components.")
  ];

  const CLASS_B = [
    mcq("b01", T.concepts, "What genre is this game?",
      ["FPS", "RPG", "Sports", "Platformer"], "A",
      "A first-person shooter (FPS) shows the world through the player's eyes, with a weapon and a HUD.",
      "b01.png", "First-person view with a gun and HUD"),
    mcq("b02", T.concepts, "What type of immersive content is this?",
      ["VR", "AR", "2.5D", "Console game"], "B",
      "Augmented Reality (AR) adds virtual objects on top of the real world, often through a phone camera.",
      "b02.png", "Phone camera showing a virtual object on a real table"),
    mcq("b03", T.setup, "What does \"LTS\" mean?",
      ["Latest Test Setup", "Long Term Support", "Light Texture System", "Local Team Server"], "B",
      "LTS means Long Term Support: a stable Unity version that gets fixes for a long time. Good for class projects.",
      "b03.png", "Unity Hub Installs tab, \"2022.3.41f1 LTS\" highlighted"),
    mcq("b04", T.setup, "When does Start run?",
      ["Every frame", "Once, before the first frame", "When the game quits", "On collision"], "B",
      "Start() runs once, just before the object's first frame. Update() is the one that runs every frame.",
      "b04.png", "Script with void Start() highlighted"),
    mcq("b05", T.setup, "What type of message is this?",
      ["Log", "Warning", "Error", "Info"], "C",
      "Red messages in the Console are errors. Yellow are warnings, white are normal logs.",
      "b05.png", "Console with a red message"),
    mcq("b06", T.ui, "Which window is this?",
      ["Scene", "Game", "Inspector", "Hierarchy"], "B",
      "The Game view shows the final camera image, with no gizmos. It is what the player sees.",
      "b06.png", "Camera's final view with no gizmos, red box"),
    mcq("b07", T.ui, "Which window is this?",
      ["Project", "Console", "Inspector", "Animator"], "B",
      "The Console lists log messages, warnings and errors.",
      "b07.png", "Panel listing log messages, red box"),
    mcq("b08", T.ui, "Which tool is this?",
      ["Move", "Rotate", "Scale", "Hand"], "B",
      "Circle handles belong to the Rotate tool (shortcut E). Move is W, Scale is R, Hand is Q.",
      "b08.png", "Rotate tool (circle handles) highlighted in the toolbar"),
    mcq("b09", T.objects, "Which component is shown?",
      ["Mesh Filter", "Box Collider", "Light", "Rigidbody"], "B",
      "The green wireframe box is a Box Collider: the invisible shape used for collisions.",
      "b09.png", "Green wireframe box around a cube"),
    mcq("b10", T.objects, "What are these shapes called?",
      ["Prefabs", "Primitives", "Materials", "Scenes"], "B",
      "Cube, Sphere, Capsule, Cylinder, Plane and Quad are Unity's built-in primitives.",
      "b10.png", "GameObject > 3D Object menu (Cube, Sphere, Capsule...)"),
    mcq("b11", T.prefabs, "What is this dropdown used for?",
      ["Deleting the prefab", "Applying or reverting instance changes", "Renaming", "Unpacking"], "B",
      "Overrides shows how an instance differs from its prefab. Apply sends changes to the prefab; Revert discards them.",
      "b11.png", "Inspector \"Overrides\" dropdown on a prefab instance"),
    mcq("b12", T.materials, "What type of asset is this?",
      ["Texture", "Material", "Prefab", "Scene"], "B",
      "Materials show as a sphere thumbnail in the Project window.",
      "b12.png", "Sphere thumbnail in the Project window"),
    mcq("b13", T.materials, "What type of map is this?",
      ["Albedo", "Normal map", "Emission", "Height"], "B",
      "Normal maps look purple-blue. They fake small bumps and dents without adding geometry.",
      "b13.png", "Purple/blue bumpy texture"),
    mcq("b14", T.git, "What is this file for?",
      ["Hiding scripts", "Stopping some files from being committed", "Deleting files", "Speeding up Unity"], "B",
      ".gitignore lists files and folders Git should not track, such as Library and Temp.",
      "b14.png", ".gitignore file contents"),
    mcq("b15", T.git, "Should this folder be committed to Git?",
      ["Yes", "No, it is auto-generated", "Only the Scripts part", "Only on the main branch"], "B",
      "No. Unity rebuilds Library on each computer, and it is large. Add it to .gitignore.",
      "b15.png", "Library folder in the project directory"),
    mcq("b16", T.git, "What does this command do?",
      ["Commits", "Stages changes", "Pushes", "Clones"], "B",
      "git add . stages every change in the folder, ready for the next commit.",
      "b16.png", "Terminal showing git add ."),
    tf("b17", T.ui, "This window lists all GameObjects in the current scene.", true,
      "True. The Hierarchy lists every GameObject in the open scene, including children.",
      "b17.png", "Hierarchy window"),
    tf("b18", T.materials, "This file is a material.", false,
      "False. A flat image such as brick.png is a texture. A material uses the texture.",
      "b18.png", "brick.png flat image file"),
    tf("b19", T.setup, "Update() runs only once.", false,
      "False. Update() runs every frame. Start() is the one that runs once."),
    tf("b20", T.concepts, "AR places virtual objects in the real world.", true,
      "True. Augmented Reality overlays virtual objects on the real world."),
    tf("b21", T.git, "Git and GitHub are the same thing.", false,
      "False. Git is the version-control tool on your computer. GitHub is a website that hosts Git repositories."),
    tf("b22", T.git, "git commit uploads your work to GitHub.", false,
      "False. git commit saves a snapshot locally. git push uploads it to GitHub."),
    tf("b23", T.objects, "A child object moves with its parent.", true,
      "True. A child's Transform is relative to its parent, so it follows the parent's movement.")
  ];

  window.QUIZ.CLASSES = [
    { id: "A", name: "Class A", questions: CLASS_A },
    { id: "B", name: "Class B", questions: CLASS_B }
  ];

  /* dev-time check: duplicate ids, wrong option counts, out-of-range answers */
  const seen = new Set();
  for (const cls of window.QUIZ.CLASSES) {
    for (const q of cls.questions) {
      const where = `${cls.name} ${q.id}`;
      if (seen.has(q.id)) console.warn(`[quiz] duplicate id: ${where}`);
      seen.add(q.id);
      const expected = q.type === "tf" ? 2 : 4;
      if (q.options.length !== expected) console.warn(`[quiz] ${where} needs ${expected} options`);
      if (!(q.correctIndex >= 0 && q.correctIndex < q.options.length)) {
        console.warn(`[quiz] ${where} has an out-of-range correctIndex`);
      }
    }
  }
})();
