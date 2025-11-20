# BattleShip Frontend

This is the frontend for the multiplayer Battleship game, built with **React**.
---

## Tech Stack

### **Frontend**
- **React**: A JavaScript library for building user interfaces.
- **Axios**: For making HTTP requests to the backend.
- **React Router**: For client-side routing.
- **CSS Modules**: For styling components.

### **Backend**
- The backend is built with **FastAPI** and provides RESTful APIs for user authentication, game management, and bot interactions. The frontend communicates with the backend via HTTP requests.

### **Database**
- The backend uses **PostgreSQL** as the database.

---

## Features

- **User Authentication**: Register and log, access protected routes.
- **Game Management**: Create, join, and play Battleship games.
- **Bot Integration**: Play against an automated bot opponent.
- **Responsive Design**: Accessable

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone
cd your-repo/my-react-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Backend URL Variable

- Replace `PRODUCTION_URL` with `http://localhost:8000` or with the URL of your backend if it's hosted elsewhere.

### 4. Start the Development Server
```bash
npm start
```

The frontend will be available at `http://localhost:3000`.

---

## Project Structure

```
my-react-app/
├── public/                 # Static files
├── src/
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components (e.g., RegisterPage, LoginPage)
│   ├── styles/             # CSS files for styling, style variables
│   ├── utils.js/           # Utility functions ( all the axios API calls)
│   ├── App.js              # Main application component
│   ├── index.js            # Entry point for the React app
├── package.json            # Project metadata and dependencies
└── README.md               # this :D
```

---

## Architecture Diagram

```
+-------------------+        +-------------------+        +-------------------+
|                   |        |                   |        |                   |
|   React Frontend  | <----> |   FastAPI Backend | <----> |   PostgreSQL DB   |
|                   |        |                   |        |                   |
+-------------------+        +-------------------+        +-------------------+
```

### **Explanation**
1. **React Frontend**:
   - Handles user interactions and sends HTTP requests to the backend.
   - Communicates with the backend via RESTful APIs.

2. **FastAPI Backend**:
   - Processes requests from the frontend.
   - Handles business logic, user authentication, and game state management.
   - Interacts with the PostgreSQL database.

3. **PostgreSQL Database**:
   - Stores user data, game states, and other persistent information.

---
