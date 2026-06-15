import os
import glob
from PIL import Image

def process_images():
    # The brain directory where artifacts are saved
    brain_dir = "/Users/jingjok/.gemini/antigravity-ide/brain/e98d2bd0-348f-41bd-9895-683194f9344f"
    dest_dir = "/Users/jingjok/Desktop/ExpenseTracker/images"
    
    # Map generated prefixes to their destination filenames
    image_map = {
        "cat_logo_green": "cute_orange_cat.png",
        "cat_kitty_green": "cute_kitty_orange.png",
        "cat_coin_green": "cute_cat_coin.png",
        "cat_reports_green": "cute_cat_reports.png"
    }
    
    for prefix, dest_name in image_map.items():
        # Find the latest generated image for this prefix
        files = glob.glob(os.path.join(brain_dir, f"{prefix}_*.png"))
        if not files:
            print(f"No files found for {prefix}")
            continue
        
        latest_file = max(files, key=os.path.getmtime)
        print(f"Processing {latest_file} -> {dest_name}")
        
        img = Image.open(latest_file).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is close to bright green #00FF00
            # RGB: item[0], item[1], item[2]
            if item[0] < 50 and item[1] > 200 and item[2] < 50:
                # Replace green with transparent
                newData.append((255, 255, 255, 0))
            # Also catch the slightly anti-aliased green edges
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
