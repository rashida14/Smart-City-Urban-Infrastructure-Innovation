from pydantic import BaseModel

class Pothole(BaseModel):
    image_url: str
    latitude: float
    longitude: float
    severity: str
    confidence: float
    status: str = "unresolved"
