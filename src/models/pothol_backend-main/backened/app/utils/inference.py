from ultralytics import YOLO
import cv2
import uuid
import os

MODEL_PATH = "runs/detect/pothole_model/weights/best.pt"
model = YOLO(MODEL_PATH)

def detect_pothole(image_path):
    results = model(image_path)
    
    boxes = results[0].boxes
    annotations = []

    output_filename = f"{uuid.uuid4()}.jpg"
    output_path = f"backend/detections/{output_filename}"

    # Draw results
    img = cv2.imread(image_path)

    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0])
        cls = int(box.cls[0])
        severity = "low" if conf < 0.5 else "medium" if conf < 0.75 else "high"

        annotations.append({
            "severity": severity,
            "confidence": conf
        })

        # draw box
        cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)
        cv2.putText(img, f"{severity} ({conf:.2f})", (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)

    cv2.imwrite(output_path, img)

    return annotations, output_path
