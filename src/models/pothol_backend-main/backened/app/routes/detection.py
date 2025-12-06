from fastapi import APIRouter, UploadFile, File, Form
import shutil
import uuid
import os
from app.utils.inference import detect_pothole
from app.database import pothole_collection

router = APIRouter()

UPLOAD_DIR = "backend/uploads/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    file_ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    annotations, detected_path = detect_pothole(file_path)

    severity = annotations[0]["severity"]
    confidence = annotations[0]["confidence"]

    # Save to DB
    pothole_collection.insert_one({
        "image_url": detected_path,
        "latitude": latitude,
        "longitude": longitude,
        "severity": severity,
        "confidence": confidence,
        "status": "unresolved"
    })

    return {
        "message": "Detection successful",
        "severity": severity,
        "confidence": confidence,
        "output_image": detected_path
    }
