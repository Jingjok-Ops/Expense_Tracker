from PIL import Image

def create_icon():
    src_path = "/Users/jingjok/Desktop/ExpenseTracker/images/rich_cat.png"
    dest_path = "/Users/jingjok/Desktop/ExpenseTracker/images/app_icon_orange.png"
    
    # Open the transparent PNG
    img = Image.open(src_path).convert("RGBA")
    
    # Create a solid orange background image of the same size
    # Color #ff8e3c is (255, 142, 60)
    bg = Image.new("RGBA", img.size, (255, 142, 60, 255))
    
    # Composite the image over the background using the image's alpha channel as a mask
    bg.paste(img, (0, 0), img)
    
    # Save the result
    bg.save(dest_path, "PNG")
    print(f"Saved {dest_path}")

if __name__ == "__main__":
    create_icon()
