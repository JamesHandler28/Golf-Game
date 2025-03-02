# Mini Golf Game

A 2D mini golf game built with p5.js and Supabase for leaderboard functionality.

## Project Structure

The codebase has been organized into a modular structure for better maintainability:

```
/
├── index.html              # Main HTML file
├── js/                     # JavaScript directory
│   ├── main.js             # Main game file with p5.js setup and draw functions
│   └── modules/            # Modular components
│       ├── ballPhysics.js  # Ball movement and physics
│       ├── camera.js       # Camera movement and transformations
│       ├── course.js       # Course setup and hole definitions
│       ├── hazards.js      # Water and sand hazards
│       ├── leaderboard.js  # Leaderboard functionality with Supabase
│       ├── obstacles.js    # Game obstacles and collision detection
│       ├── platforms.js    # Ground platforms and collision detection
│       └── ui.js           # User interface elements
└── leaderboard_setup.sql   # SQL setup for Supabase leaderboard
```

## Game Controls

- **Mouse Drag**: Aim and shoot the ball (drag back to set power and direction)
- **S Key**: Toggle scorecard view
- **L Key**: Toggle leaderboard view

## Game Features

- Multiple holes with different layouts
- Physics-based ball movement with gravity and friction
- Various terrain types (grass, sand, water)
- Obstacles and hazards
- Scorecard tracking
- Online leaderboard

## Development

The game uses ES6 modules for code organization. Each module handles a specific aspect of the game, making it easier to maintain and extend.

To modify the ball's rolling physics, check the `ballPhysics.js` module, specifically the `updateBallPhysics` function.

## Leaderboard

The game uses Supabase for the online leaderboard functionality. Players can submit their scores at the end of the game.
