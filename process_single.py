import os
import glob
from PIL import Image

def process_images():
    brain_dir = "/Users/jingjok/.gemini/antigravity-ide/brain/e98d2bd0-348f-41bd-9895-683194f9344f"
    dest_dir = "/Users/jingjok/Desktop/ExpenseTracker/images"
    
    image_map = {
        "cat_logo_green": "cute_orange_cat.png"
    }
    
    for prefix, dest_name in image_map.items():
        files = glob.glob(os.path.join(brain_dir, f"{prefix}_*.png"))
        if not files:
            continue
        
        latest_file = max(files, key=os.path.getmtime)
        print(f"Processing {latest_file} -> {dest_name}")
        
        img = Image.open(latest_file).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            if item[0] < 50 and item[1] > 200 and item[2] < 50:
                newData.append((255, 255, 255, 0))
            elif item[1] > item[0] + 50 and item[1] > item[2] + 50 and item[1] > 100:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        dest_path = os.path.join(dest_dir, dest_name)
        img.save(dest_path, "PNG")
        print(f"Saved {dest_path}")

if __name__ == "__main__":
    process_images()
