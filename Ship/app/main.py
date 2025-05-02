from fastapi import FastAPI
from app.api.routes import users, games, boards, ships, auth, bot_routes
from fastapi.middleware.cors import CORSMiddleware
from app.database.db_setup import Base, get_engine

engine = get_engine()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multiplayer Battleship")

origins = [
    "http://localhost:8000",  # FastAPI backend
    "http://localhost:3000",  # React app frontend
    "https://battleship-frontend-m414.onrender.com", # Render frontend
    "https://battleshipv2-1.onrender.com", # Render backend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(boards.router, prefix="/boards", tags=["boards"])
app.include_router(ships.router, prefix="/ships", tags=["ships"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(bot_routes.router, prefix="/bot", tags=["bot"])
