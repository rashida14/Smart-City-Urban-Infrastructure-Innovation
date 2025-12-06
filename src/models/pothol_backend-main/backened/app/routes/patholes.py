from fastapi import APIRouter
from app.database import pothole_collection

router = APIRouter()

@router.get("/all")
def get_all():
    data = list(pothole_collection.find({}, {"_id": 0}))
    return {"potholes": data}

@router.put("/update-status")
def update_status(pothole_id: str, status: str):
    pothole_collection.update_one(
        {"id": pothole_id},
        {"$set": {"status": status}}
    )
    return {"message": "Status updated"}
