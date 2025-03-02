// Supabase configuration
const SUPABASE_URL = 'https://uoqpwwfwoffrvywexuoq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcXB3d2Z3b2ZmcnZ5d2V4dW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NTE4MDgsImV4cCI6MjA1NjUyNzgwOH0.b5uFwgltwAHbL14F5cTYSHqmwUwytY3i3s0J_TRQiKE';
let supabaseClient;

// Leaderboard variables
let leaderboard = [];
let showNameInput = false;
let playerName = '';
let showLeaderboard = false;
let leaderboardFetched = false;

// Global variables
let ball_x = 100;           // Ball's x position
let ball_y;                 // Ball's y position (set in setup)
let ball_vx = 0;            // Ball's x velocity
let ball_vy = 0;            // Ball's y velocity
let ball_radius = 10;       // Ball's radius
let ground_y = 550;         // Y-coordinate of the ground
let hole_x = 400;           // Hole's x position
let hole_y = 50;            // Hole's y position (at the top)
let hole_width = 30;        // Hole's width (narrower for more challenge)
let hole_depth = 20;        // Hole's depth
let gravity = 0.1;          // Gravity acceleration
let friction = 0.99;        // Friction coefficient
let grass_bounce = 0.1;     // Bounce coefficient for grass (small bounce)
let ball_state = 'idle';    // Ball's state: 'idle', 'in_air', 'rolling', 'in_hole', 'in_water', 'in_sand'
let shot_count = 0;         // Number of shots taken
let game_over = false;      // Indicates if the game is won
let is_dragging = false;    // Tracks if the player is dragging to shoot
let in_hazard = false;      // Tracks if the ball is in a hazard
let hazard_type = '';       // Type of hazard: 'water' or 'sand'
let sand_power_reduction = 0.5; // Power reduction when hitting from sand
let last_shot_x = 100;      // X position of the last shot
let last_shot_y;            // Y position of the last shot
let sink_timer = 0;         // Timer for sinking animation
let sink_duration = 60;     // Duration of sinking animation (in frames)

// Course variables
let current_hole = 1;       // Current hole number (1-18)
let total_holes = 18;       // Total number of holes in the course
let hole_scores = [];       // Array to store scores for each hole
let hole_pars = [];         // Par values for each hole
let show_scorecard = false; // Whether to show the scorecard
let game_completed = false; // Whether all holes have been completed

// Golf club variables
let club_x = 0;             // Club's current x position
let club_y = 0;             // Club's current y position
let prev_club_x = 0;        // Club's previous x position
let prev_club_y = 0;        // Club's previous y position
let club_radius = 15;       // Club head radius
let club_speed_x = 0;       // Club's x speed
let club_speed_y = 0;       // Club's y speed
let club_power = 0.15;      // Multiplier for club impact force
let can_hit = true;         // Whether the club can hit the ball
let club_history = [];      // Array to store recent club positions for trail effect

// Wall and obstacle variables
let left_wall = 20;         // Left wall position
let right_wall = 780;       // Right wall position
let wall_bounce = 0.7;      // Wall bounce coefficient (energy loss)
let platforms = [];         // Array to store platforms
let obstacles = [];         // Array to store obstacles

// Camera variables
let camera_y = 0;           // Camera y offset for scrolling
let target_camera_y = 0;    // Target camera position for smooth scrolling

function setup() {
  // Create the canvas
  createCanvas(800, 600);
  
  // Set the initial y position of the ball to rest on the ground
  ball_y = ground_y - ball_radius;
  
  // Initialize club position
  club_x = mouseX;
  club_y = mouseY;
  prev_club_x = club_x;
  prev_club_y = club_y;
  
  // Initialize hole scores and pars
  for (let i = 0; i < total_holes; i++) {
    hole_scores[i] = 0;
    
    // Set par values for each hole based on difficulty
    if (i < 5) {
      hole_pars[i] = 3; // Par 3 for easier holes (1-5)
    } else if (i < 14) {
      hole_pars[i] = 4; // Par 4 for medium holes (6-14)
    } else {
      hole_pars[i] = 5; // Par 5 for harder holes (15-18)
    }
  }
  
  // Initialize Supabase client
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase client initialized");
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
  }
  
  // Add event listeners for the name input form
  document.getElementById('submitScoreBtn').addEventListener('click', submitScore);
  document.getElementById('skipLeaderboardBtn').addEventListener('click', hideNameInput);
  
  // Set up the first hole
  setupHole(current_hole);
}

// Function to show the name input form
function showNameInputForm() {
  // Calculate total score and score relative to par
  let totalScore = 0;
  let totalPar = 0;
  
  for (let i = 0; i < total_holes; i++) {
    totalScore += hole_scores[i];
    totalPar += hole_pars[i];
  }
  
  let relativeToPar = totalScore - totalPar;
  let parText = relativeToPar === 0 ? "Even" : (relativeToPar > 0 ? "+" + relativeToPar : relativeToPar);
  
  // Update the score display
  document.getElementById('finalScoreDisplay').textContent = 
    `Your final score: ${totalScore} (${parText})`;
  
  // Show the form
  document.getElementById('nameInputContainer').style.display = 'block';
  showNameInput = true;
  
  // Focus on the input field
  document.getElementById('playerNameInput').focus();
}

// Function to hide the name input form
function hideNameInput() {
  document.getElementById('nameInputContainer').style.display = 'none';
  showNameInput = false;
  
  // Show the scorecard
  show_scorecard = true;
}

// Function to submit score to Supabase
async function submitScore() {
  // Get player name from input
  playerName = document.getElementById('playerNameInput').value.trim();
  
  if (!playerName) {
    alert("Please enter your name");
    return;
  }
  
  // Calculate total score and score relative to par
  let totalScore = 0;
  let totalPar = 0;
  
  for (let i = 0; i < total_holes; i++) {
    totalScore += hole_scores[i];
    totalPar += hole_pars[i];
  }
  
  let relativeToPar = totalScore - totalPar;
  
  try {
    // First check if player already exists
    const { data: existingPlayer } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .eq('player_name', playerName)
      .single();
    
    if (existingPlayer) {
      // Only update if new score is better (lower)
      if (totalScore < existingPlayer.total_score) {
        const { data, error } = await supabaseClient
          .from('leaderboard')
          .update({
            total_score: totalScore,
            relative_to_par: relativeToPar,
            date_played: new Date()
          })
          .eq('player_name', playerName);
        
        if (error) throw error;
        console.log("Score updated:", data);
      } else {
        console.log("Existing score is better, not updating");
      }
    } else {
      // Insert new player score
      const { data, error } = await supabaseClient
        .from('leaderboard')
        .insert([
          {
            player_name: playerName,
            total_score: totalScore,
            relative_to_par: relativeToPar
          }
        ]);
      
      if (error) throw error;
      console.log("Score inserted:", data);
    }
    
    // Fetch updated leaderboard
    fetchLeaderboard();
    
    // Hide the form and show the leaderboard
    hideNameInput();
    showLeaderboard = true;
    
  } catch (error) {
    console.error("Error submitting score:", error);
    alert("Error submitting score. Please try again.");
  }
}

// Function to fetch leaderboard from Supabase
async function fetchLeaderboard() {
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: true })
      .limit(10);
    
    if (error) throw error;
    
    leaderboard = data;
    leaderboardFetched = true;
    console.log("Leaderboard fetched:", leaderboard);
    
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    leaderboard = [];
  }
}

// Function to draw the leaderboard
function drawLeaderboard() {
  background(240, 240, 200);
  
  // Title
  fill(0);
  textSize(32);
  text("LEADERBOARD", width / 2 - 120, 50);
  
  // If leaderboard hasn't been fetched yet, show loading message
  if (!leaderboardFetched) {
    textSize(18);
    text("Loading leaderboard...", width / 2 - 100, height / 2);
    return;
  }
  
  // If leaderboard is empty, show message
  if (leaderboard.length === 0) {
    textSize(18);
    text("No scores yet. Be the first to submit!", width / 2 - 150, height / 2);
  } else {
    // Draw table headers
    textSize(16);
    fill(0);
    text("Rank", 50, 100);
    text("Player", 150, 100);
    text("Score", 350, 100);
    text("To Par", 450, 100);
    text("Date", 550, 100);
    
    // Draw horizontal line
    stroke(0);
    line(30, 110, width - 30, 110);
    noStroke();
    
    // Draw leaderboard entries
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const y = 140 + (i * 30);
      
      // Highlight the current player
      if (entry.player_name === playerName) {
        fill(220, 220, 255);
        rect(30, y - 20, width - 60, 25);
      }
      
      fill(0);
      textAlign(LEFT);
      
      // Rank
      text(`${i + 1}`, 50, y);
      
      // Player name
      text(entry.player_name, 150, y);
      
      // Score
      text(entry.total_score, 350, y);
      
      // Score relative to par
      let parText = entry.relative_to_par === 0 ? "Even" : 
                   (entry.relative_to_par > 0 ? "+" + entry.relative_to_par : entry.relative_to_par);
      
      // Color code the score
      if (entry.relative_to_par < 0) fill(0, 150, 0);
      else if (entry.relative_to_par === 0) fill(0);
      else fill(150, 0, 0);
      
      text(parText, 450, y);
      fill(0);
      
      // Date
      const date = new Date(entry.date_played);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      text(dateStr, 550, y);
    }
  }
  
  // Back button
  fill(50, 50, 200);
  rect(width / 2 - 80, height - 60, 160, 40);
  fill(255);
  textSize(20);
  textAlign(CENTER);
  text("Back to Game", width / 2, height - 35);
  
  // Reset text alignment
  textAlign(LEFT);
}

// Setup a specific hole based on hole number
function setupHole(hole_number) {
  // Reset ball position and state
  ball_x = 100;
  ball_y = ground_y - ball_radius;
  ball_vx = 0;
  ball_vy = 0;
  ball_state = 'idle';
  is_dragging = false;
  game_over = false;
  shot_count = 0;
  camera_y = 0;
  target_camera_y = 0;
  in_hazard = false;
  hazard_type = '';
  last_shot_x = 100;
  last_shot_y = ground_y - ball_radius;
  sink_timer = 0;
  
  // Clear platforms and obstacles
  platforms = [];
  obstacles = [];
  
  // Add the ground platform
  platforms.push({
    x: width / 2,
    y: ground_y,
    width: width,
    height: 50,
    color: [34, 139, 34]
  });
  
  // Set hole position based on the hole number
  switch(hole_number) {
    case 1:
      // Hole 1: Challenging straight shot with obstacles and a sand trap
      hole_x = 600;
      hole_y = ground_y;
      
      // Add obstacles that block the direct path
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 100,
        width: 30,
        height: 100,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Add a sand trap
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      // Add a low barrier that must be jumped over
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 20,
        width: 40,
        height: 20,
        color: [150, 75, 0],
        isBarrier: true
      });
      break;
      
    case 2:
      // Hole 2: Elevated hole with challenging ramps and water hazard
      hole_x = 650;
      hole_y = ground_y;
      
      // Ramp to help get up
      platforms.push({
        x: 300,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100],
        angle: -0.2 // Angled ramp
      });
      
      // Water hazard between ramps
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Second ramp
      platforms.push({
        x: 500,
        y: ground_y - 40,
        width: 150,
        height: 20,
        color: [100, 100, 100],
        angle: 0.2 // Angled ramp
      });
      
      // Barrier that must be jumped over
      obstacles.push({
        type: 'rect',
        x: 580,
        y: ground_y - 30,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      break;
      
    case 3:
      // Hole 3: Multiple platforms with barriers and hazards
      hole_x = 700;
      hole_y = ground_y;
      
      // Create a series of platforms with barriers
      platforms.push({
        x: 200,
        y: ground_y - 80,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Barrier on first platform
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 110,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Second platform
      platforms.push({
        x: 400,
        y: ground_y - 120,
        width: 180,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Moving obstacle on second platform
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 150,
        width: 40,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2,
        moveDirection: 1,
        moveRange: 120,
        startX: 400,
        isBarrier: true
      });
      
      // Sand trap on the ground
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 5,
        width: 200,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      // Final platform
      platforms.push({
        x: 600,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      break;
      
    case 4:
      // Hole 4: Water hazard with narrow bridge
      hole_x = 650;
      hole_y = ground_y;
      
      // Narrow bridge over water
      platforms.push({
        x: 400,
        y: ground_y - 10,
        width: 80,
        height: 10,
        color: [100, 100, 100]
      });
      
      // Water hazard (smaller area that doesn't extend as far right)
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 5,
        width: 300,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Barriers on both sides of the bridge
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 40,
        width: 20,
        height: 40,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 40,
        width: 20,
        height: 40,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Sand trap before the hole
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 5,
        width: 80,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      break;
      
    case 5:
      // Hole 5: Windmill obstacle with water and sand
      hole_x = 650;
      hole_y = ground_y;
      
      // Windmill base
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 60,
        width: 40,
        height: 60,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Windmill blade (faster rotation)
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 120,
        width: 150,
        height: 15,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 0,
        moveDirection: 1,
        moveRange: 0,
        startX: 400,
        isRotating: true,
        angle: 0,
        rotationSpeed: 0.05,
        isBarrier: true
      });
      
      // Water hazard before windmill
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 5,
        width: 80,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Sand trap after windmill
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      break;
      
    case 6:
      // Hole 6: Loop-de-loop with barriers
      hole_x = 700;
      hole_y = ground_y;
      
      // Create a curved ramp
      for (let i = 0; i < 10; i++) {
        let angle = map(i, 0, 9, 0, PI);
        let x = 400 + cos(angle) * 100;
        let y = ground_y - 150 + sin(angle) * 100;
        
        platforms.push({
          x: x,
          y: y,
          width: 50,
          height: 10,
          color: [100, 100, 100],
          angle: angle + PI/2
        });
      }
      
      // Barrier at the top of the loop
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 250,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Landing platform
      platforms.push({
        x: 600,
        y: ground_y - 50,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Water hazard if you fall off
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 5,
        width: 300,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      break;
      
    case 7:
      // Hole 7: Moving platforms with barriers
      hole_x = 700;
      hole_y = ground_y;
      
      // First moving platform (faster)
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 80,
        width: 120,
        height: 20,
        color: [100, 150, 100],
        isMoving: true,
        moveSpeed: 3,
        moveDirection: 1,
        moveRange: 150,
        startX: 300,
        isPlatform: true
      });
      
      // Barrier on first platform
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 110,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true,
        isMoving: true,
        moveSpeed: 3,
        moveDirection: 1,
        moveRange: 150,
        startX: 300
      });
      
      // Second moving platform (opposite direction)
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 160,
        width: 120,
        height: 20,
        color: [100, 150, 100],
        isMoving: true,
        moveSpeed: 2.5,
        moveDirection: -1,
        moveRange: 120,
        startX: 550,
        isPlatform: true
      });
      
      // Barrier on second platform
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 190,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true,
        isMoving: true,
        moveSpeed: 2.5,
        moveDirection: -1,
        moveRange: 120,
        startX: 550
      });
      
      // Water hazard below
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 5,
        width: 500,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      break;
      
    case 8:
      // Hole 8: Pinball-style bumpers with barriers
      hole_x = 700;
      hole_y = ground_y;
      
      // Add bumpers (circles that give extra bounce)
      for (let i = 0; i < 5; i++) {
        obstacles.push({
          type: 'circle',
          x: 200 + i * 100,
          y: ground_y - 100 - (i % 2) * 50,
          radius: 25,
          color: [255, 100, 100],
          isBumper: true,
          bounceMultiplier: 1.7
        });
      }
      
      // Add barriers between bumpers
      for (let i = 0; i < 4; i++) {
        obstacles.push({
          type: 'rect',
          x: 250 + i * 100,
          y: ground_y - 75 - (i % 2) * 25,
          width: 20,
          height: 50 + (i % 2) * 25,
          color: [150, 75, 0],
          isBarrier: true
        });
      }
      
      // Sand traps
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      break;
      
    case 9:
      // Hole 9: Zig-zag path with barriers and hazards
      hole_x = 700;
      hole_y = ground_y;
      
      // Zig-zag platforms
      platforms.push({
        x: 200,
        y: ground_y - 80,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 400,
        y: ground_y - 160,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 600,
        y: ground_y - 80,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add taller walls to force zig-zag
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 140,
        width: 20,
        height: 120,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 220,
        width: 20,
        height: 120,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Water hazards below platforms
      obstacles.push({
        type: 'rect',
        x: 200,
        y: ground_y - 5,
        width: 600,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Moving barrier on middle platform
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 190,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2,
        moveDirection: 1,
        moveRange: 150,
        startX: 400,
        isBarrier: true
      });
      break;
      
    case 10:
      // Hole 10: Rotating wheel with barriers
      hole_x = 700;
      hole_y = ground_y;
      
      // Center of the wheel
      let wheelX = 400;
      let wheelY = ground_y - 150;
      let wheelRadius = 100;
      
      // Add the wheel center
      obstacles.push({
        type: 'circle',
        x: wheelX,
        y: wheelY,
        radius: 20,
        color: [100, 100, 100],
        isBarrier: true
      });
      
      // Add rotating platforms with barriers
      for (let i = 0; i < 4; i++) {
        let angle = i * PI / 2;
        obstacles.push({
          type: 'rect',
          x: wheelX,
          y: wheelY,
          width: wheelRadius * 2,
          height: 15,
          color: [100, 150, 100],
          isRotating: true,
          angle: angle,
          rotationSpeed: 0.03,
          isPlatform: true
        });
        
        // Add barriers on each platform
        obstacles.push({
          type: 'rect',
          x: wheelX + cos(angle) * 50,
          y: wheelY + sin(angle) * 50,
          width: 20,
          height: 30,
          color: [150, 75, 0],
          isRotating: true,
          angle: angle,
          rotationSpeed: 0.03,
          isBarrier: true
        });
      }
      
      // Landing platform
      platforms.push({
        x: 650,
        y: ground_y - 50,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Water hazard below
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 5,
        width: 400,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      break;
      
    case 11:
      // Hole 11: Staggered platforms with water hazards
      hole_x = 700;
      hole_y = ground_y;
      
      // Create a series of staggered platforms
      platforms.push({
        x: 250,
        y: ground_y - 60,
        width: 120,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 400,
        y: ground_y - 120,
        width: 120,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 550,
        y: ground_y - 60,
        width: 120,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add water hazards between platforms
      obstacles.push({
        type: 'rect',
        x: 325,
        y: ground_y - 5,
        width: 150,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 475,
        y: ground_y - 5,
        width: 150,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add barriers on platforms
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 90,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 150,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 280,
        width: 550,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    case 12:
      // Hole 12: Narrow bridge with moving obstacles
      hole_x = 650;
      hole_y = ground_y;
      
      // Create a narrow bridge
      platforms.push({
        x: 400,
        y: ground_y - 40,
        width: 500,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add moving obstacles on the bridge
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 70,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2,
        moveDirection: 1,
        moveRange: 150,
        startX: 250,
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 70,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2.5,
        moveDirection: -1,
        moveRange: 150,
        startX: 450,
        isBarrier: true
      });
      
      // Add water below, but with a gap around the hole
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 5,
        width: 300,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add sand trap before the hole
      obstacles.push({
        type: 'rect',
        x: 580,
        y: ground_y - 45,
        width: 80,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      break;
      
    case 13:
      // Hole 13: Bumper maze
      hole_x = 650;
      hole_y = ground_y;
      
      // Create a grid of bumpers
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          if ((i + j) % 2 === 0) { // Checkerboard pattern
            obstacles.push({
              type: 'circle',
              x: 250 + i * 100,
              y: ground_y - 50 - j * 100,
              radius: 25,
              color: [255, 100, 100],
              isBumper: true,
              bounceMultiplier: 1.5
            });
          }
        }
      }
      
      // Add barriers to create a maze
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 120,
        width: 20,
        height: 120,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 80,
        width: 20,
        height: 80,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Add sand trap near the hole
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      break;
      
    case 14:
      // Hole 14: Rotating windmills and water
      hole_x = 700;
      hole_y = ground_y;
      
      // Create a platform with multiple windmills - reduced width
      platforms.push({
        x: 400,
        y: ground_y - 40,
        width: 400, // Reduced from 600 to 400
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add multiple windmills
      for (let i = 0; i < 3; i++) {
        // Windmill base
        obstacles.push({
          type: 'rect',
          x: 200 + i * 150,
          y: ground_y - 90,
          width: 20,
          height: 50,
          color: [150, 75, 0],
          isBarrier: true
        });
        
        // Windmill blade
        obstacles.push({
          type: 'rect',
          x: 200 + i * 150,
          y: ground_y - 90,
          width: 120,
          height: 15,
          color: [200, 50, 50],
          isMoving: true,
          moveSpeed: 0,
          moveDirection: 1,
          moveRange: 0,
          startX: 200 + i * 150,
          isRotating: true,
          angle: i * (PI / 3), // Stagger the starting angles
          rotationSpeed: 0.04 + (i * 0.01), // Different speeds
          isBarrier: true
        });
      }
      
      // Add water below, but with a gap around the hole
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 5,
        width: 300, // Reduced from 400 to 300
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add a safe landing area near the hole
      platforms.push({
        x: 650,
        y: ground_y - 40,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 250,
        width: 600,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    case 15:
      // Hole 15: Tiered platforms with moving obstacles
      hole_x = 650;
      hole_y = ground_y;
      
      // Create tiered platforms
      platforms.push({
        x: 250,
        y: ground_y - 60,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 450,
        y: ground_y - 120,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 650,
        y: ground_y - 60,
        width: 200,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add moving obstacles on each platform
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 90,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 1.5,
        moveDirection: 1,
        moveRange: 100,
        startX: 250,
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 150,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2,
        moveDirection: -1,
        moveRange: 100,
        startX: 450,
        isBarrier: true
      });
      
      // Add water and sand hazards - adjusted sand trap to not cover hole
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 5,
        width: 200,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 5,
        width: 80, // Reduced from 200 to 80
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 300,
        width: 500,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    case 16:
      // Hole 16: Angled ramps with barriers
      hole_x = 700;
      hole_y = ground_y;
      
      // Create angled ramps
      platforms.push({
        x: 250,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100],
        angle: -0.3 // Upward slope
      });
      
      platforms.push({
        x: 450,
        y: ground_y - 120,
        width: 150,
        height: 20,
        color: [100, 100, 100],
        angle: 0.3 // Downward slope
      });
      
      platforms.push({
        x: 650,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100],
        angle: 0 // Flat
      });
      
      // Add barriers on ramps
      obstacles.push({
        type: 'rect',
        x: 250,
        y: ground_y - 90,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 150,
        width: 20,
        height: 30,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      // Add bumpers to help/hinder
      obstacles.push({
        type: 'circle',
        x: 350,
        y: ground_y - 100,
        radius: 25,
        color: [255, 100, 100],
        isBumper: true,
        bounceMultiplier: 1.5
      });
      
      // Add water hazards with a gap for the hole
      obstacles.push({
        type: 'rect',
        x: 350,
        y: ground_y - 5,
        width: 200,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 550,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 270,
        width: 600,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    case 17:
      // Hole 17: Rotating wheel with multiple platforms
      hole_x = 700;
      hole_y = ground_y;
      
      // Center of the wheel (use different variable names)
      let wheel17X = 400;
      let wheel17Y = ground_y - 150;
      let wheel17Radius = 120;
      
      // Add the wheel center
      obstacles.push({
        type: 'circle',
        x: wheel17X,
        y: wheel17Y,
        radius: 20,
        color: [100, 100, 100],
        isBarrier: true
      });
      
      // Add rotating platforms with barriers (6 spokes)
      for (let i = 0; i < 6; i++) {
        let angle = i * PI / 3;
        obstacles.push({
          type: 'rect',
          x: wheel17X,
          y: wheel17Y,
          width: wheel17Radius * 2,
          height: 15,
          color: [100, 150, 100],
          isRotating: true,
          angle: angle,
          rotationSpeed: 0.02,
          isPlatform: true
        });
        
        // Add barriers on alternating platforms
        if (i % 2 === 0) {
          obstacles.push({
            type: 'rect',
            x: wheel17X + cos(angle) * 60,
            y: wheel17Y + sin(angle) * 60,
            width: 20,
            height: 30,
            color: [150, 75, 0],
            isRotating: true,
            angle: angle,
            rotationSpeed: 0.02,
            isBarrier: true
          });
        }
      }
      
      // Landing platform
      platforms.push({
        x: 650,
        y: ground_y - 50,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add sand trap before the hole
      obstacles.push({
        type: 'rect',
        x: 600,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      // Add water hazard below
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 5,
        width: 400,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 320,
        width: 400,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    case 18:
      // Hole 18: Final challenge with all elements
      hole_x = 700;
      hole_y = ground_y;
      
      // Create a series of platforms with different challenges
      platforms.push({
        x: 200,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 400,
        y: ground_y - 120,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      platforms.push({
        x: 600,
        y: ground_y - 60,
        width: 150,
        height: 20,
        color: [100, 100, 100]
      });
      
      // Add a windmill obstacle
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 170,
        width: 20,
        height: 50,
        color: [150, 75, 0],
        isBarrier: true
      });
      
      obstacles.push({
        type: 'rect',
        x: 400,
        y: ground_y - 170,
        width: 120,
        height: 15,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 0,
        moveDirection: 1,
        moveRange: 0,
        startX: 400,
        isRotating: true,
        angle: 0,
        rotationSpeed: 0.04,
        isBarrier: true
      });
      
      // Add bumpers
      obstacles.push({
        type: 'circle',
        x: 300,
        y: ground_y - 100,
        radius: 25,
        color: [255, 100, 100],
        isBumper: true,
        bounceMultiplier: 1.5
      });
      
      obstacles.push({
        type: 'circle',
        x: 500,
        y: ground_y - 100,
        radius: 25,
        color: [255, 100, 100],
        isBumper: true,
        bounceMultiplier: 1.5
      });
      
      // Add a moving obstacle
      obstacles.push({
        type: 'rect',
        x: 600,
        y: ground_y - 90,
        width: 30,
        height: 30,
        color: [200, 50, 50],
        isMoving: true,
        moveSpeed: 2,
        moveDirection: 1,
        moveRange: 100,
        startX: 600,
        isBarrier: true
      });
      
      // Add water hazards
      obstacles.push({
        type: 'rect',
        x: 300,
        y: ground_y - 5,
        width: 200,
        height: 10,
        color: [0, 100, 255],
        isWater: true
      });
      
      // Add sand traps
      obstacles.push({
        type: 'rect',
        x: 500,
        y: ground_y - 5,
        width: 100,
        height: 10,
        color: [240, 230, 140],
        isSand: true
      });
      
      // Add sky obstacles to prevent hitting over everything
      obstacles.push({
        type: 'rect',
        x: 450,
        y: ground_y - 300,
        width: 700,
        height: 15, // Increased from 10 to 15
        color: [50, 100, 255],
        isBarrier: true,
        isSky: true
      });
      break;
      
    default:
      // This should never happen now that we've defined all holes
      console.log("Warning: Undefined hole number " + hole_number);
      // Set a simple default hole
      hole_x = 600;
      hole_y = ground_y;
      break;
  }
}

function draw() {
  // Check if we should show the name input form
  if (showNameInput) {
    // Don't draw anything while the name input form is showing
    return;
  }
  
  // Check if we should show the leaderboard
  if (showLeaderboard) {
    drawLeaderboard();
    return;
  }
  
  // Check if we should show the scorecard
  if (show_scorecard) {
    drawScorecard();
    return;
  }
  
  // Update camera position to follow the ball
  updateCamera();
  
  // Draw the sky (light blue)
  background(135, 206, 235);
  
  // Apply camera transformation
  push();
  translate(0, -camera_y);
  
  // Draw platforms
  drawPlatforms();
  
  // Draw the walls
  fill(100, 50, 0);  // Brown color for walls
  rect(0, 0, left_wall, height + ground_y);  // Left wall
  rect(right_wall, 0, width - right_wall, height + ground_y);  // Right wall
  
  // Draw obstacles
  drawObstacles();
  
  // Draw the hole (a depression in the ground)
  fill(0);  // Black for the hole
  rect(hole_x - hole_width/2, hole_y, hole_width, hole_depth);
  
  // Add a gradient effect to make the hole look deeper
  for (let i = 0; i < 5; i++) {
    let alpha = 150 - i * 30;
    fill(0, 0, 0, alpha);
    let shrink = i * 2;
    rect(hole_x - hole_width/2 + shrink, hole_y + i, hole_width - shrink * 2, 2);
  }
  
  // Add a white circle at the bottom of the hole to make it more visible
  fill(150);  // Light gray for the hole bottom
  ellipse(hole_x, hole_y + hole_depth - 2, hole_width - 10, 5);
  
  // Draw the shot direction line when dragging
  if (is_dragging) {
    // Calculate the vector from ball to mouse
    let dragVecX = mouseX - ball_x;
    let dragVecY = (mouseY + camera_y) - ball_y;
    
    // Limit the drag vector length for visualization
    let dragLength = sqrt(dragVecX * dragVecX + dragVecY * dragVecY);
    let maxLength = 100;
    if (dragLength > maxLength) {
      dragVecX = (dragVecX / dragLength) * maxLength;
      dragVecY = (dragVecY / dragLength) * maxLength;
    }
    
    // Draw the aiming line
    stroke(255, 0, 0);
    strokeWeight(3);
    line(ball_x, ball_y, ball_x - dragVecX, ball_y - dragVecY);
    noStroke();
    
    // Draw power indicator
    let power = min(dragLength / maxLength, 1);
    fill(255, 0, 0);
    rect(ball_x - 20, ball_y - 30, 40 * power, 5);
  }
  
  // Draw the golf ball (white circle)
  fill(255);
    stroke(0);
  strokeWeight(1);
  ellipse(ball_x, ball_y - camera_y, ball_radius * 2, ball_radius * 2);
  
  pop(); // End camera transformation
  
  // Update club position and calculate speed
  prev_club_x = club_x;
  prev_club_y = club_y;
  club_x = constrain(mouseX, left_wall + club_radius, right_wall - club_radius);
  club_y = mouseY;
  club_speed_x = club_x - prev_club_x;
  club_speed_y = club_y - prev_club_y;
  
  // Add current club position to history for trail effect
  club_history.push({x: club_x, y: club_y + camera_y});
  // Limit history length
  if (club_history.length > 10) {
    club_history.shift();
  }
  
  // Draw club trail
    noStroke();
  for (let i = 0; i < club_history.length - 1; i++) {
    let alpha = map(i, 0, club_history.length - 1, 50, 200);
    fill(100, 100, 200, alpha);
    let size = map(i, 0, club_history.length - 1, 5, club_radius);
    ellipse(club_history[i].x, club_history[i].y - camera_y, size);
  }
  
  // Draw the golf club (blue circle)
  fill(100, 100, 200);
  ellipse(club_x, club_y, club_radius * 2);
  
  // Update ball physics based on state
  if (ball_state === 'in_air') {
    // Apply gravity
    ball_vy += gravity;
    
    // Store previous position for collision detection
    let prev_ball_y = ball_y;
    
    // Update position
    ball_x += ball_vx;
    ball_y += ball_vy;
    
    // Check for collision with walls
    if (ball_x - ball_radius < left_wall) {
      ball_x = left_wall + ball_radius;
      ball_vx *= -wall_bounce;  // Bounce with energy loss
    } else if (ball_x + ball_radius > right_wall) {
      ball_x = right_wall - ball_radius;
      ball_vx *= -wall_bounce;  // Bounce with energy loss
    }
    
    // Check for water and sand hazards first
    checkHazardCollisions();
    
    // Only check other collisions if we're not in a hazard
    if (ball_state !== 'in_water' && ball_state !== 'in_sand') {
      // Check for collision with obstacles
      checkObstacleCollisions();
      
      // Check if the ball is above the hole and moving downward
      if (isAboveHole(ball_x) && ball_y + ball_radius >= hole_y && ball_y < hole_y + hole_depth && ball_vy > 0) {
        // Only fall in if the ball is moving slowly enough horizontally
        if (abs(ball_vx) < 3) {
          // Ball is above the hole, let it fall in
          ball_state = 'in_hole';
          ball_y = hole_y;  // Position the ball at the top of the hole
          ball_vy = 0.5;    // Give it a small downward velocity
        } else {
          // Ball is moving too fast, bounce over the hole
          ball_y = hole_y - ball_radius;
          ball_vy *= -0.5;  // Reduced bounce
          ball_vx *= 0.8;   // Slow down horizontally
        }
      } 
      // Check if the ball hits a platform
      else {
        // Check if the ball crossed a platform boundary during this frame
        let platformAtBall = getPlatformAtPosition(ball_x, ball_y + ball_radius);
        
        // If no platform found at current position, check if we passed through one
        if (!platformAtBall && ball_vy > 0) {
          // Check if the ball was above a platform in the previous frame
          let platformAtPrevPos = getPlatformAtPosition(ball_x, prev_ball_y + ball_radius);
          if (platformAtPrevPos) {
            // Ball passed through a platform, place it on top
            platformAtBall = platformAtPrevPos;
          }
        }
        
        if (platformAtBall) {
          ball_y = platformAtBall.y - ball_radius;
          
          // Add a small bounce if the ball is falling with enough velocity
          if (ball_vy > 1) {
            ball_vy = -ball_vy * grass_bounce; // Apply a small bounce
            ball_state = 'in_air'; // Keep the ball in the air state
          } else {
            // If the ball is moving slowly, just stop it
            ball_vy = 0;
            ball_state = 'rolling';
          }
        }
        
        // Special check for ground collision
    if (ball_y + ball_radius > ground_y) {
      ball_y = ground_y - ball_radius;
          
          // Add a small bounce if the ball is falling with enough velocity
          if (ball_vy > 1) {
            ball_vy = -ball_vy * grass_bounce; // Apply a small bounce
            ball_state = 'in_air'; // Keep the ball in the air state
          } else {
            // If the ball is moving slowly, just stop it
            ball_vy = 0;
            ball_state = 'rolling';
          }
        }
        
        // Check if ball falls below the screen
        if (ball_y > ground_y + 100) {
          // Reset ball position
          ball_x = 100;
          ball_y = ground_y - ball_radius;
          ball_vx = 0;
          ball_vy = 0;
          ball_state = 'idle';
        }
      }
    }
  } else if (ball_state === 'rolling') {
    // Apply friction
    ball_vx *= friction;
    
    // Update position
    ball_x += ball_vx;
    
    // Check for collision with walls
    if (ball_x - ball_radius < left_wall) {
      ball_x = left_wall + ball_radius;
      ball_vx *= -wall_bounce;  // Bounce with energy loss
    } else if (ball_x + ball_radius > right_wall) {
      ball_x = right_wall - ball_radius;
      ball_vx *= -wall_bounce;  // Bounce with energy loss
    }
    
    // Check for water and sand hazards first
    checkHazardCollisions();
    
    // Only check other collisions if we're not in a hazard
    if (ball_state !== 'in_water' && ball_state !== 'in_sand') {
      // Check for collision with obstacles
      checkObstacleCollisions();
      
      // Check if the ball rolls into the hole
      if (isAboveHole(ball_x) && abs(ball_y + ball_radius - hole_y) < 5) {
        // Only fall in if the ball is moving slowly enough horizontally
        if (abs(ball_vx) < 2) {
          ball_state = 'in_hole';  // Let it fall into the hole
          ball_y = hole_y;         // Position the ball at the top of the hole
          ball_vy = 1.0;           // Give it a more noticeable downward velocity
          
          // Add a small random horizontal movement for realism
          ball_vx = ball_vx * 0.5 + random(-0.2, 0.2);
        } else {
          // Ball is moving too fast, make it roll over the hole with a slight dip
          ball_vy = 0.5;  // Small downward velocity
          ball_state = 'in_air';  // Transition to in_air state
          
          // Slow down slightly when rolling over the hole
          ball_vx *= 0.95;
        }
      }
      // Check if the ball rolls off a platform
      else {
        let platformAtBall = getPlatformAtPosition(ball_x, ball_y + ball_radius + 1);
        if (!platformAtBall && ball_y + ball_radius < ground_y - 1) {
          ball_state = 'in_air';  // Ball is falling
        }
      }
      
    // Stop the ball if speed is very low
    if (abs(ball_vx) < 0.1) {
      ball_vx = 0;
        
        // Check if the ball is directly above the hole when it stops
        if (isAboveHole(ball_x) && abs(ball_y + ball_radius - hole_y) < 5) {
          ball_state = 'in_hole';  // Let it fall into the hole
          ball_y = hole_y;         // Position the ball at the top of the hole
          ball_vy = 0.5;           // Give it a small downward velocity
        } else {
      ball_state = 'idle';
    }
  }
    }
  } else if (ball_state === 'in_hole') {
    // Ball is in the hole, apply stronger friction
    ball_vx *= 0.9;
    ball_vy += 0.2;  // Increased gravity in the hole for faster sinking
    
    // Add a slight wobble for realism
    if (ball_y < hole_y + hole_depth/2) {
      ball_vx += random(-0.1, 0.1);
    }
    
    // Update position
    ball_x += ball_vx;
    ball_y += ball_vy;
    
    // Keep the ball within the hole horizontally
    if (ball_x < hole_x - hole_width/2 + ball_radius) {
      ball_x = hole_x - hole_width/2 + ball_radius;
      ball_vx *= -0.5;  // Bounce off the side with energy loss
    } else if (ball_x > hole_x + hole_width/2 - ball_radius) {
      ball_x = hole_x + hole_width/2 - ball_radius;
      ball_vx *= -0.5;  // Bounce off the side with energy loss
    }
    
    // Check if the ball has reached the bottom of the hole
    if (ball_y >= hole_y + hole_depth - ball_radius - 1) {
      ball_y = hole_y + hole_depth - ball_radius - 1;  // Keep the ball at the bottom
      ball_vy = 0;
      ball_vx = 0;
      
      // Check if the ball is settled in the hole
      if (abs(ball_vx) < 0.1) {
    game_over = true;
  }
    }
  } else if (ball_state === 'in_water') {
    // Ball is in water, apply sinking effect
    sink_timer++;
    
    // Calculate sinking progress (0 to 1)
    let progress = min(sink_timer / sink_duration, 1);
    
    // Sink the ball gradually
    ball_vy = 0.5 + progress * 1.5;  // Increase sinking speed over time
    ball_vx *= 0.8;                  // Slow down horizontally in water
    
    // Update position
    ball_x += ball_vx;
    ball_y += ball_vy;
    
    // If sinking animation is complete, reset to last shot position
    if (sink_timer >= sink_duration) {
      // Reset ball position to where it was last hit from
      ball_x = last_shot_x;
      ball_y = last_shot_y;
      ball_vx = 0;
      ball_vy = 0;
      ball_state = 'idle';
      shot_count += 1; // Penalty stroke
      in_hazard = false;
      hazard_type = '';
      sink_timer = 0;
    }
  } else if (ball_state === 'in_sand') {
    // Ball is in sand, immediately stop and sink slightly
    sink_timer++;
    
    // Immediately stop all movement
    ball_vx = 0;
    ball_vy = 0;
    
    // Calculate sinking progress (0 to 1)
    let progress = min(sink_timer / 10, 1);  // Faster sinking in sand
    
    // Sink the ball slightly into the sand (only during initial contact)
    if (sink_timer <= 10) {
      ball_y += progress * 0.2;
    }
    
    // Ball is now at rest in the sand
    if (sink_timer >= 10) {
      // Keep track that we're in sand for the next shot
      in_hazard = true;
      hazard_type = 'sand';
      sink_timer = 10;  // Cap the timer
      
      // Change state to idle so the player can hit it
      ball_state = 'idle';
    }
  }
  
  // Update moving obstacles
  updateMovingObstacles();
  
  // Display the shot count and hole information
  fill(0);
  textSize(16);
  text("Hole: " + current_hole + " / " + total_holes, 10, 20);
  text("Par: " + hole_pars[current_hole - 1], 10, 45);
  text("Shots: " + shot_count, 10, 70);
  
  // Display scorecard button
  fill(50, 50, 200);
  rect(width - 100, 30, 90, 30);
  fill(255);
  textSize(14);
  text("Scorecard", width - 90, 50);
  
  // Display hazard information if the ball is in a hazard
  if (in_hazard) {
    fill(255, 0, 0);
    textSize(18);
    if (hazard_type === 'water') {
      text("Ball in water! +1 stroke penalty", width / 2 - 120, 30);
    } else if (hazard_type === 'sand') {
      text("Ball in sand! Reduced power", width / 2 - 100, 30);
    }
  }
  
  // Display game over message
  if (game_over) {
    // Save the score for this hole
    hole_scores[current_hole - 1] = shot_count;
    
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    
    fill(255);
    textSize(32);
    text("Hole " + current_hole + " Complete!", width / 2 - 150, height / 2 - 80);
    textSize(24);
    text("Shots: " + shot_count + " (Par: " + hole_pars[current_hole - 1] + ")", width / 2 - 120, height / 2 - 40);
    
    // Calculate score relative to par
    let relativeToPar = shot_count - hole_pars[current_hole - 1];
    let scoreText;
    if (relativeToPar < 0) {
      scoreText = "Birdie";
      if (relativeToPar < -1) scoreText = "Eagle";
      if (relativeToPar < -2) scoreText = "Albatross";
    } else if (relativeToPar === 0) {
      scoreText = "Par";
    } else {
      scoreText = "Bogey";
      if (relativeToPar > 1) scoreText = "Double Bogey";
      if (relativeToPar > 2) scoreText = "Triple Bogey";
    }
    text(scoreText, width / 2 - 50, height / 2);
    
    // Display next hole button
    fill(50, 200, 50);
    rect(width / 2 - 80, height / 2 + 40, 160, 40);
    fill(255);
    textSize(20);
    
    if (current_hole < total_holes) {
      text("Next Hole", width / 2 - 50, height / 2 + 65);
    } else {
      text("View Final Score", width / 2 - 80, height / 2 + 65);
      game_completed = true;
    }
  }
  
  // Display hazard indicator if in a hazard
  if (in_hazard) {
    fill(255);
    textSize(16);
    if (hazard_type === 'water') {
      fill(0, 100, 255);
      text("IN WATER! Ball will reset to previous position with penalty", width / 2 - 200, 20);
    } else if (hazard_type === 'sand') {
      fill(240, 230, 140);
      text("IN SAND! Ball is stuck, shot power reduced by 50%", width / 2 - 180, 20);
    }
  }
  
  // Draw special effects for hazards
  if (ball_state === 'in_water') {
    // Draw water ripples
    noFill();
    stroke(0, 100, 255, 150);
    let rippleSize = 10 + sink_timer / 3;
    ellipse(ball_x, ball_y - camera_y, rippleSize, rippleSize * 0.5);
    ellipse(ball_x, ball_y - camera_y, rippleSize * 1.5, rippleSize * 0.75);
    
    // Draw bubbles
    fill(255, 255, 255, 150);
    noStroke();
    for (let i = 0; i < 3; i++) {
      let bubbleX = ball_x + sin(frameCount * 0.1 + i * 2) * 5;
      let bubbleY = ball_y - camera_y - sink_timer/4 - i * 5;
      let bubbleSize = 3 + sin(frameCount * 0.2 + i) * 2;
      ellipse(bubbleX, bubbleY, bubbleSize, bubbleSize);
    }
  } else if (ball_state === 'in_sand') {
    // Draw sand particles
    fill(240, 230, 140, 150);
    noStroke();
    for (let i = 0; i < 5; i++) {
      let particleX = ball_x + random(-10, 10);
      let particleY = ball_y - camera_y - random(0, 5);
      let particleSize = random(1, 3);
      ellipse(particleX, particleY, particleSize, particleSize);
    }
  }
  
  // Draw bubbles in water
  if (ball_state === 'in_water') {
    fill(255, 255, 255, 150);
    noStroke();
    for (let i = 0; i < 3; i++) {
      let bubbleX = ball_x + random(-5, 5);
      let bubbleY = ball_y - camera_y - random(0, 10);
      let bubbleSize = random(2, 5);
      ellipse(bubbleX, bubbleY, bubbleSize, bubbleSize);
    }
  } else if (ball_state === 'in_sand') {
    // Draw sand particles
    fill(240, 230, 140, 150);
    noStroke();
    for (let i = 0; i < 5; i++) {
      let particleX = ball_x + random(-10, 10);
      let particleY = ball_y - camera_y - random(0, 5);
      let particleSize = random(1, 3);
      ellipse(particleX, particleY, particleSize, particleSize);
    }
  }
  
  // Display instructions
  fill(0);
  textSize(14);
  text("Click and drag from the ball, then release to shoot.", 10, height - 60);
  text("Avoid water hazards (blue) - ball resets to previous position with penalty.", 10, height - 40);
  text("Be careful of sand traps (yellow) - ball gets stuck and shot power is reduced.", 10, height - 20);
}

// Draw the scorecard
function drawScorecard() {
  background(240, 240, 200);
  
  // Title
  fill(0);
  textSize(32);
  text("SCORECARD", width / 2 - 100, 50);
  
  // Calculate layout dimensions
  let holeWidth = 40;
  let columnSpacing = 45;
  let startX = 50;
  let headerY = 100;
  let scoreY = 140;
  let totalY = 200;
  
  // Draw table headers
  textSize(16);
  text("Hole", startX, headerY);
  text("Par", startX, headerY + 30);
  text("Score", startX, headerY + 60);
  
  // Draw horizontal line
  stroke(0);
  line(30, headerY + 70, width - 30, headerY + 70);
  noStroke();
  
  // Draw scores for each hole horizontally
  let front9Par = 0;
  let back9Par = 0;
  let front9Score = 0;
  let back9Score = 0;
  let totalScore = 0;
  
  for (let i = 0; i < total_holes; i++) {
    let x = startX + columnSpacing + (i * holeWidth);
    
    // Draw hole number
    fill(0);
    textAlign(CENTER);
    
    // Highlight current hole
    if (i === current_hole - 1 && !game_completed) {
      fill(0, 100, 0);
    }
    
    text((i + 1), x, headerY);
    
    // Draw par
    fill(0);
    text(hole_pars[i], x, headerY + 30);
    
    // Track front 9 and back 9 pars
    if (i < 9) {
      front9Par += hole_pars[i];
    } else {
      back9Par += hole_pars[i];
    }
    
    // Draw score
    if (i < current_hole || game_completed) {
      if (hole_scores[i] > 0) {
        // Color code the score based on performance
        let relativeToPar = hole_scores[i] - hole_pars[i];
        if (relativeToPar < 0) fill(0, 150, 0); // Under par (good)
        else if (relativeToPar === 0) fill(0); // Par
        else if (relativeToPar === 1) fill(150, 150, 0); // Bogey
        else fill(150, 0, 0); // Double bogey or worse
        
        text(hole_scores[i], x, headerY + 60);
        
        // Track front 9 and back 9 scores
        if (i < 9) {
          front9Score += hole_scores[i];
        } else {
          back9Score += hole_scores[i];
        }
        
        totalScore = front9Score + back9Score;
      } else {
        fill(100);
        text("-", x, headerY + 60);
      }
    } else {
      fill(100);
      text("-", x, headerY + 60);
    }
  }
  
  // Reset text alignment
  textAlign(LEFT);
  
  // Draw totals
  fill(0);
  textSize(18);
  text("Total", startX, totalY);
  
  textAlign(CENTER);
  text(front9Par, startX + columnSpacing + (4.5 * holeWidth), totalY); // Front 9 par total
  text(front9Score > 0 ? front9Score : "-", startX + columnSpacing + (4.5 * holeWidth), totalY + 30); // Front 9 score
  
  text(back9Par, startX + columnSpacing + (13.5 * holeWidth), totalY); // Back 9 par total
  text(back9Score > 0 ? back9Score : "-", startX + columnSpacing + (13.5 * holeWidth), totalY + 30); // Back 9 score
  
  // Draw front 9, back 9 labels
  fill(0);
  textSize(16);
  text("Front 9", startX + columnSpacing + (4.5 * holeWidth), totalY - 30);
  text("Back 9", startX + columnSpacing + (13.5 * holeWidth), totalY - 30);
  
  // Draw vertical separator between front 9 and back 9
  stroke(0);
  line(startX + columnSpacing + (9 * holeWidth) - holeWidth/2, headerY - 10, 
       startX + columnSpacing + (9 * holeWidth) - holeWidth/2, totalY + 40);
  noStroke();
  
  // Draw total score
  fill(0);
  textSize(20);
  textAlign(LEFT);
  text("TOTAL SCORE:", 50, totalY + 70);
  text(totalScore > 0 ? totalScore : "-", 200, totalY + 70);
  
  // Calculate total score relative to par
  let totalPar = front9Par + back9Par;
  let totalRelativeToPar = totalScore - totalPar;
  let totalScoreText = totalRelativeToPar === 0 ? "Even" : (totalRelativeToPar > 0 ? "+" + totalRelativeToPar : totalRelativeToPar);
  text("TO PAR:", 300, totalY + 70);
  
  // Color code the total score
  if (totalRelativeToPar < 0) fill(0, 150, 0);
  else if (totalRelativeToPar === 0) fill(0);
  else fill(150, 0, 0);
  
  text(totalScore > 0 ? totalScoreText : "-", 400, totalY + 70);
  
  // Draw buttons
  // Continue button
  fill(50, 200, 50);
  rect(width / 2 - 80, height - 60, 160, 40);
  fill(255);
  textSize(20);
  textAlign(CENTER);
  
  if (game_completed) {
    text("Play Again", width / 2, height - 35);
    
    // Add leaderboard button when game is completed
    fill(50, 50, 200);
    rect(width / 2 - 80, height - 110, 160, 40);
    fill(255);
    text("Leaderboard", width / 2, height - 85);
  } else {
    text("Continue", width / 2, height - 35);
  }
  
  // Reset text alignment
  textAlign(LEFT);
}

// Check if the ball's x position is above the hole
function isAboveHole(x) {
  return x > hole_x - hole_width/2 && x < hole_x + hole_width/2;
}

// Check if the ball is settled in the hole
function isInHole() {
  // Ball is considered in the hole when it's in the in_hole state and has sunk at least halfway down
  return ball_state === 'in_hole' && 
         ball_y > hole_y + hole_depth/2 &&
         abs(ball_vx) < 0.5 && 
         ball_x > hole_x - hole_width/2 + ball_radius && 
         ball_x < hole_x + hole_width/2 - ball_radius;
}

// Draw all platforms
function drawPlatforms() {
  for (let platform of platforms) {
    fill(platform.color[0], platform.color[1], platform.color[2]);
    
    if (platform.angle !== undefined) {
      // Draw angled platform
      push();
      translate(platform.x, platform.y);
      rotate(platform.angle);
      rect(-platform.width/2, 0, platform.width, platform.height);
      pop();
    } else {
      // Draw regular platform
      rect(platform.x - platform.width/2, platform.y, platform.width, platform.height);
    }
  }
}

// Draw all obstacles
function drawObstacles() {
  for (let obstacle of obstacles) {
    if (obstacle.isRotating) {
      // Save the current transformation matrix
      push();
      
      // Translate to the center of the obstacle
      translate(obstacle.x, obstacle.y - camera_y);
      
      // Rotate by the current angle
      rotate(obstacle.angle);
      
      // Draw the rotated rectangle
      fill(obstacle.color);
      rect(-obstacle.width/2, -obstacle.height/2, obstacle.width, obstacle.height);
      
      // Restore the transformation matrix
      pop();
    } else if (obstacle.type === 'rect') {
      // Draw rectangle obstacle
      if (obstacle.isWater) {
        // Water hazard
        fill(0, 100, 255, 180);  // Semi-transparent blue
        noStroke();
        rect(obstacle.x - obstacle.width/2, obstacle.y - camera_y, obstacle.width, obstacle.height);
        
        // Add water wave effect
        stroke(255, 255, 255, 100);
        strokeWeight(1);
        for (let i = 0; i < 3; i++) {
          let waveY = obstacle.y - camera_y + i * 3 + sin(frameCount * 0.1 + i) * 2;
          line(obstacle.x - obstacle.width/2, waveY, 
               obstacle.x + obstacle.width/2, waveY);
        }
      } else if (obstacle.isSand) {
        // Sand trap
        fill(240, 230, 140);  // Sand color
        noStroke();
        rect(obstacle.x - obstacle.width/2, obstacle.y - camera_y, obstacle.width, obstacle.height);
        
        // Add sand texture
        fill(210, 200, 120, 100);
        for (let i = 0; i < obstacle.width/10; i++) {
          let sandX = obstacle.x - obstacle.width/2 + i * 10 + random(-2, 2);
          let sandY = obstacle.y - camera_y + random(-2, 2);
          ellipse(sandX, sandY, 5, 2);
        }
      } else if (obstacle.isSky) {
        // Simplified sky obstacle - just a semi-transparent blue rectangle
        fill(100, 150, 255, 150);  // Light blue, semi-transparent
        stroke(255, 255, 255, 100);
        strokeWeight(2);
        rect(obstacle.x - obstacle.width/2, obstacle.y - camera_y, obstacle.width, obstacle.height);
      } else {
        // Regular obstacle (barrier)
        fill(obstacle.color);
        // Draw the obstacle with the correct position
        rect(obstacle.x - obstacle.width/2, obstacle.y - obstacle.height - camera_y, obstacle.width, obstacle.height);
      }
    } else if (obstacle.type === 'circle') {
      // Draw circle obstacle
      fill(obstacle.color);
      ellipse(obstacle.x, obstacle.y - camera_y, obstacle.radius * 2, obstacle.radius * 2);
      
      // Add visual effect for bumpers
      if (obstacle.isBumper) {
        noFill();
        stroke(255, 255, 255, 100 + sin(frameCount * 0.1) * 50);
        strokeWeight(2);
        ellipse(obstacle.x, obstacle.y - camera_y, obstacle.radius * 2 + 5, obstacle.radius * 2 + 5);
      }
    }
  }
}

// Update moving obstacles
function updateMovingObstacles() {
  for (let obstacle of obstacles) {
    if (obstacle.isMoving) {
      // Update position for moving obstacles
      obstacle.x += obstacle.moveSpeed * obstacle.moveDirection;
      
      // Check if obstacle reached its movement limits
      if (obstacle.x > obstacle.startX + obstacle.moveRange || 
          obstacle.x < obstacle.startX - obstacle.moveRange) {
        obstacle.moveDirection *= -1;
      }
    }
    
    if (obstacle.isRotating) {
      // Update angle for rotating obstacles
      obstacle.angle += obstacle.rotationSpeed;
      
      // Check for collision with the ball for rotating obstacles
      if (ball_state === 'in_air' || ball_state === 'rolling') {
        // Calculate the ball position relative to the obstacle center
        let relX = ball_x - obstacle.x;
        let relY = ball_y - obstacle.y;
        
        // Rotate the ball position to match the obstacle's rotation
        let rotatedX = relX * cos(-obstacle.angle) - relY * sin(-obstacle.angle);
        let rotatedY = relX * sin(-obstacle.angle) + relY * cos(-obstacle.angle);
        
        // Check if the rotated position is inside the rectangle
        if (abs(rotatedX) < obstacle.width/2 + ball_radius && 
            abs(rotatedY) < obstacle.height/2 + ball_radius) {
          // Collision detected
          
          // Determine which side was hit
          let overlapX = obstacle.width/2 + ball_radius - abs(rotatedX);
          let overlapY = obstacle.height/2 + ball_radius - abs(rotatedY);
          
          // Calculate normal vector
          let nx = 0;
          let ny = 0;
          
          if (overlapX < overlapY) {
            // Hit on left or right side
            nx = rotatedX > 0 ? 1 : -1;
          } else {
            // Hit on top or bottom
            ny = rotatedY > 0 ? 1 : -1;
          }
          
          // Rotate normal vector back
          let worldNx = nx * cos(obstacle.angle) - ny * sin(obstacle.angle);
          let worldNy = nx * sin(obstacle.angle) + ny * cos(obstacle.angle);
          
          // Normalize
          let len = sqrt(worldNx * worldNx + worldNy * worldNy);
          worldNx /= len;
          worldNy /= len;
          
          // Calculate reflection vector
          let dotProduct = ball_vx * worldNx + ball_vy * worldNy;
          ball_vx = ball_vx - 2 * dotProduct * worldNx;
          ball_vy = ball_vy - 2 * dotProduct * worldNy;
          
          // Apply energy loss
          ball_vx *= 0.8;
          ball_vy *= 0.8;
          
          // Add some velocity from the rotating obstacle
          let tangentialSpeed = obstacle.rotationSpeed * 
                               sqrt(relX * relX + relY * relY);
          let tangentX = -worldNy;
          let tangentY = worldNx;
          
          ball_vx += tangentX * tangentialSpeed * 0.5;
          ball_vy += tangentY * tangentialSpeed * 0.5;
          
          // Move ball outside obstacle
          ball_x += worldNx * (overlapX < overlapY ? overlapX : 0) * 1.1;
          ball_y += worldNy * (overlapY <= overlapX ? overlapY : 0) * 1.1;
        }
      }
    }
  }
}

// Check for collisions with obstacles
function checkObstacleCollisions() {
  for (let obstacle of obstacles) {
    // Skip collision check if the ball is in the hole
    if (ball_state === 'in_hole') continue;
    
    // Handle sky obstacles first - improved collision
    if (obstacle.isSky && obstacle.type === 'rect') {
      // Check if ball is within the horizontal bounds of the sky obstacle
      if (ball_x > obstacle.x - obstacle.width/2 - ball_radius && 
          ball_x < obstacle.x + obstacle.width/2 + ball_radius) {
        
        // Check if the ball is hitting the bottom of the sky barrier
        if (ball_state === 'in_air' && 
            ball_y - ball_radius <= obstacle.y + obstacle.height && 
            ball_y - ball_radius >= obstacle.y) {
          
          // Gentle bounce with minimal damping
          ball_vy = Math.abs(ball_vy) * 0.3; // Much less bouncy
          
          // If the ball is moving very slowly, let it come to rest
          if (Math.abs(ball_vy) < 0.5 && Math.abs(ball_vx) < 0.5) {
            ball_vy = 0;
            ball_vx *= 0.8; // Additional horizontal friction
            
            // If the ball is almost stopped, set it to rolling state
            if (Math.abs(ball_vx) < 0.1) {
              ball_state = 'rolling';
              ball_vx = 0;
            }
          }
        }
        
        // Check if the ball is on top of the sky barrier
        if (ball_state === 'in_air' && 
            ball_y + ball_radius >= obstacle.y && 
            ball_y + ball_radius <= obstacle.y + 5) {
          
          // Place the ball on top of the sky barrier
          ball_y = obstacle.y - ball_radius;
          ball_vy = 0;
          ball_state = 'rolling';
          
          // Apply friction to horizontal movement
          ball_vx *= 0.95;
        }
      }
      continue; // Skip the rest of the collision checks for sky obstacles
    }
    
    // Skip rotating obstacles as they're handled in updateMovingObstacles
    if (obstacle.isRotating) continue;
    
    // Skip water and sand hazards as they're handled in checkHazardCollisions
    if (obstacle.isWater || obstacle.isSand) continue;
    
    // Check if this obstacle is a platform
    if (obstacle.isPlatform) {
      // Check if the ball is on top of the platform
      if (ball_vy > 0 && // Ball is moving downward
          ball_y + ball_radius <= obstacle.y && // Ball was above the platform
          ball_y + ball_radius + ball_vy >= obstacle.y && // Ball will be below the platform top
          ball_x >= obstacle.x - obstacle.width/2 && // Ball is horizontally within the platform
          ball_x <= obstacle.x + obstacle.width/2) {
        
        // Place the ball on top of the platform
        ball_y = obstacle.y - ball_radius;
        ball_vy = 0;
        ball_state = 'rolling';
        
        // If the platform is moving, add its velocity to the ball
        if (obstacle.isMoving) {
          ball_vx += obstacle.moveSpeed * obstacle.moveDirection * 0.8;
        }
        
        return;
      }
    }
    
    if (obstacle.type === 'rect' && !obstacle.isPlatform) {
      // For regular obstacles, check if the ball is colliding with the rectangle
      let halfWidth = obstacle.width / 2;
      let halfHeight = obstacle.height / 2;
      
      // Calculate the obstacle's top-left corner
      let obstacleLeft = obstacle.x - halfWidth;
      let obstacleTop = obstacle.y - obstacle.height;
      
      // Find the closest point on the rectangle to the ball
      let closestX = Math.max(obstacleLeft, Math.min(ball_x, obstacleLeft + obstacle.width));
      let closestY = Math.max(obstacleTop, Math.min(ball_y, obstacleTop + obstacle.height));
      
      // Calculate the distance between the ball and the closest point
      let distanceX = ball_x - closestX;
      let distanceY = ball_y - closestY;
      let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      // Check if the ball is colliding with the rectangle
      if (distance < ball_radius) {
        // Calculate the normal vector
        let nx = distanceX / distance;
        let ny = distanceY / distance;
        
        // Calculate the reflection vector
        let dotProduct = ball_vx * nx + ball_vy * ny;
        ball_vx = ball_vx - 2 * dotProduct * nx;
        ball_vy = ball_vy - 2 * dotProduct * ny;
        
        // Apply energy loss
        ball_vx *= 0.8;
        ball_vy *= 0.8;
        
        // Move the ball outside the obstacle
        let correction = ball_radius - distance + 1;
        ball_x += nx * correction;
        ball_y += ny * correction;
        
        // If this is a barrier, ensure the ball can't go through it
        if (obstacle.isBarrier) {
          // Add extra bounce for barriers
          ball_vx *= 1.1;
          ball_vy *= 1.1;
        }
      }
    } else if (obstacle.type === 'circle') {
      // Circle collision
      let distance = dist(ball_x, ball_y, obstacle.x, obstacle.y);
      
      if (distance < ball_radius + obstacle.radius) {
        // Calculate normal vector
        let nx = (ball_x - obstacle.x) / distance;
        let ny = (ball_y - obstacle.y) / distance;
        
        // Calculate reflection vector
        let dotProduct = ball_vx * nx + ball_vy * ny;
        ball_vx = ball_vx - 2 * dotProduct * nx;
        ball_vy = ball_vy - 2 * dotProduct * ny;
        
        // Apply energy loss or boost for bumpers
        let bounceFactor = obstacle.isBumper ? obstacle.bounceMultiplier : 0.8;
        ball_vx *= bounceFactor;
        ball_vy *= bounceFactor;
        
        // Move ball outside obstacle
        let correction = ball_radius + obstacle.radius - distance + 1;
        ball_x += nx * correction;
        ball_y += ny * correction;
        
        // Add visual/sound effect for bumpers
        if (obstacle.isBumper) {
          // We could add a visual effect here in a full implementation
        }
        
        // If this is a barrier, ensure the ball can't go through it
        if (obstacle.isBarrier) {
          // Add extra bounce for barriers
          ball_vx *= 1.1;
          ball_vy *= 1.1;
        }
      }
    }
  }
}

// Check for collisions with water and sand hazards
function checkHazardCollisions() {
  for (let obstacle of obstacles) {
    if (obstacle.isWater || obstacle.isSand) {
      // Check if ball is touching the hazard
      if (ball_x >= obstacle.x - obstacle.width/2 && 
          ball_x <= obstacle.x + obstacle.width/2 && 
          ball_y + ball_radius >= obstacle.y && 
          ball_y - ball_radius <= obstacle.y + obstacle.height) {
        
        if (obstacle.isWater && ball_state !== 'in_water') {
          // Ball hit water
          ball_state = 'in_water';
          in_hazard = true;
          hazard_type = 'water';
          sink_timer = 0;
        } else if (obstacle.isSand && ball_state !== 'idle' && !in_hazard) {
          // Ball in sand - immediately stop all movement
          ball_state = 'in_sand';
          in_hazard = true;
          hazard_type = 'sand';
          sink_timer = 0;
          
          // Immediately stop all movement
          ball_vx = 0;
          ball_vy = 0;
          
          // Position the ball at the top of the sand
          ball_y = obstacle.y - ball_radius;
        }
      }
    }
  }
}

// Get the platform at a specific position
function getPlatformAtPosition(x, y) {
  // First check regular platforms
  for (let platform of platforms) {
    if (x >= platform.x - platform.width/2 && 
        x <= platform.x + platform.width/2 && 
        y >= platform.y - 5 && // Add a small buffer above the platform
        y <= platform.y + 5) { // Add a small buffer below the platform
      return platform;
    }
  }
  
  // Then check obstacles that are platforms
  for (let obstacle of obstacles) {
    if (obstacle.isPlatform && 
        x >= obstacle.x - obstacle.width/2 && 
        x <= obstacle.x + obstacle.width/2 && 
        y >= obstacle.y - 5 && // Add a small buffer above the platform
        y <= obstacle.y + 5) { // Add a small buffer below the platform
      return obstacle;
    }
  }
  
  return null;
}

// Update camera position to follow the ball
function updateCamera() {
  // Calculate target camera position
  if (ball_y < height / 2) {
    target_camera_y = ball_y - height / 2;
  } else {
    target_camera_y = 0;
  }
  
  // Smooth camera movement
  camera_y = camera_y * 0.9 + target_camera_y * 0.1;
  
  // Constrain camera to not go below ground
  camera_y = max(0, camera_y);
}

// Handle mouse press to start dragging
function mousePressed() {
  // Check if we're in leaderboard view
  if (showLeaderboard) {
    // Check if back button is clicked
    if (mouseX > width / 2 - 80 && mouseX < width / 2 + 80 &&
        mouseY > height - 60 && mouseY < height - 20) {
      // Hide leaderboard and return to game or scorecard
      showLeaderboard = false;
      show_scorecard = true;
    }
    return; // Don't process other mouse events when leaderboard is open
  }
  
  // Check if we're in scorecard view
  if (show_scorecard) {
    // Check if continue/play again button is clicked
    if (mouseX > width / 2 - 80 && mouseX < width / 2 + 80 &&
        mouseY > height - 60 && mouseY < height - 20) {
      if (game_completed) {
        // Start a new game
        current_hole = 1;
        for (let i = 0; i < total_holes; i++) {
          hole_scores[i] = 0;
        }
        game_completed = false;
        setupHole(current_hole);
      }
      // Hide scorecard and return to game
      show_scorecard = false;
    }
    
    // Check if view leaderboard button is clicked (add this button in drawScorecard)
    if (mouseX > width / 2 - 80 && mouseX < width / 2 + 80 &&
        mouseY > height - 110 && mouseY < height - 70 && game_completed) {
      // Fetch and show leaderboard
      fetchLeaderboard();
      show_scorecard = false;
      showLeaderboard = true;
    }
    
    return; // Don't process other mouse events when scorecard is open
  }
  
  // Check if the game is over and the next hole/view score button is clicked
  if (game_over) {
    if (mouseX > width / 2 - 80 && mouseX < width / 2 + 80 &&
        mouseY > height / 2 + 40 && mouseY < height / 2 + 80) {
      if (current_hole < total_holes) {
        // Move to the next hole
        current_hole++;
        setupHole(current_hole);
      } else {
        // Game completed - show name input form for leaderboard
        game_completed = true;
        showNameInputForm();
      }
      game_over = false;
      return;
    }
  }
  
  // Check if scorecard button is clicked
  if (mouseX > width - 100 && mouseX < width - 10 &&
      mouseY > 30 && mouseY < 60) {
    show_scorecard = true;
    return;
  }
  
  // Only allow dragging when the ball is idle or in sand and the mouse is on the ball
  let mouseWorldY = mouseY + camera_y;
  if ((ball_state === 'idle' || (in_hazard && hazard_type === 'sand')) && 
      dist(mouseX, mouseWorldY, ball_x, ball_y) < ball_radius * 2) {
    is_dragging = true;
    // Record the position of the last shot
    last_shot_x = ball_x;
    last_shot_y = ball_y;
  }
}

// Handle mouse release to shoot the ball
function mouseReleased() {
  if (is_dragging) {
    // Save the current position as the last shot position
    last_shot_x = ball_x;
    last_shot_y = ball_y;
    
    // Calculate velocity based on drag direction (mouse to ball, reversed)
    let dx = ball_x - mouseX;
    let dy = ball_y - (mouseY + camera_y);
    
    // Calculate the angle of the shot
    let angle = atan2(dy, dx);
    
    // Scale the velocity based on distance (with a maximum power)
    let distance = sqrt(dx * dx + dy * dy);
    let maxDistance = 100;
    let power = min(distance / maxDistance, 1) * 0.2;
    
    // Reduce power if in sand
    if (in_hazard && hazard_type === 'sand') {
      power *= sand_power_reduction;
    }
    
    // Calculate velocities based on angle and power
    // This preserves the direction while ensuring the ball gets airborne
    ball_vx = cos(angle) * power * distance;
    ball_vy = sin(angle) * power * distance;
    
    // Ensure minimum velocity to get the ball moving
    let minVelocity = 0.5;
    if (abs(ball_vx) < minVelocity && abs(ball_vy) < minVelocity) {
      // Scale up both components proportionally to maintain direction
      let scale = minVelocity / max(abs(ball_vx), abs(ball_vy));
      ball_vx *= scale;
      ball_vy *= scale;
    }
    
    // Force the ball into the air state regardless of velocity
    ball_state = 'in_air';
    
    // Increment shot count
    shot_count++;
    
    // Reset dragging state
    is_dragging = false;
    
    // Reset hazard state if we're leaving it
    if (in_hazard && hazard_type === 'sand') {
      in_hazard = false;
      hazard_type = '';
    }
  }
}