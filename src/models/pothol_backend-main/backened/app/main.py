from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import detection
from app.routes import patholes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router, prefix="/api")
app.include_router(patholes.router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Pothole Detection API Running"}
