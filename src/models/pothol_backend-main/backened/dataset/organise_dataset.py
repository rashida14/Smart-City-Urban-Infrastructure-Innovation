import os
import shutil
from sklearn.model_selection import train_test_split

# Path to your raw dataset
DATASET_PATH = "Pothole Dataset"

# Output YOLO folders
OUTPUT_PATH = "dataset"
TRAIN_IMG = os.path.join(OUTPUT_PATH, "train/images")
TRAIN_LBL = os.path.join(OUTPUT_PATH, "train/labels")
VAL_IMG = os.path.join(OUTPUT_PATH, "val/images")
VAL_LBL = os.path.join(OUTPUT_PATH, "val/labels")

# Create folders
os.makedirs(TRAIN_IMG, exist_ok=True)
os.makedirs(TRAIN_LBL, exist_ok=True)
os.makedirs(VAL_IMG, exist_ok=True)
os.makedirs(VAL_LBL, exist_ok=True)

# Get all image files
images = [f for f in os.listdir(DATASET_PATH) if f.endswith(".jpg")]

# Train/validation split
train_files, val_files = train_test_split(images, test_size=0.2, random_state=42)

def move_files(file_list, img_dest, lbl_dest):
    for img in file_list:
        label = img.replace(".jpg", ".txt")

        # Source paths
        img_src = os.path.join(DATASET_PATH, img)
        label_src = os.path.join(DATASET_PATH, label)

        # Destination paths
        shutil.copy(img_src, img_dest)
        shutil.copy(label_src, lbl_dest)

# Move files
move_files(train_files, TRAIN_IMG, TRAIN_LBL)
move_files(val_files, VAL_IMG, VAL_LBL)

print("Dataset organized successfully!")
