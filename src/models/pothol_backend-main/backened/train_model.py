from ultralytics import YOLO

model = YOLO("yolov8s.pt")  

model.train(
    data="dataset/data.yaml",
    epochs=30,
    imgsz=512,
    batch=2,
    workers=0,
    device="cpu",
    name="pothole_model",
    pretrained=True  
)
