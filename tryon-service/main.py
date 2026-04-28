from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from pathlib import Path
import time
from PIL import Image

app = FastAPI(title="EcoWardrobe Try-On Service")

# Allow requests from the Node backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def process_tryon(user_image_path: str, cloth_image_path: str, output_path: str):
    """
    Simulates the Virtual Try-On process.
    FUTURE MODEL INTEGRATION (HR-VITON, VITON-HD) will go here.
    For now, it returns a placeholder image (e.g., resizing and combining them, or just returning one of them).
    """
    try:
        # Simulate processing time
        time.sleep(2)
        
        # Open images to ensure they are valid
        user_img = Image.open(user_image_path).convert("RGBA")
        cloth_img = Image.open(cloth_image_path).convert("RGBA")
        
        # Create a simple placeholder: paste cloth onto user image for demo purposes
        # This is a very rudimentary simulation
        cloth_img = cloth_img.resize((user_img.width // 2, user_img.height // 2))
        
        # Create a copy for the output
        result_img = user_img.copy()
        
        # Paste the clothing in the center (placeholder logic)
        paste_x = (result_img.width - cloth_img.width) // 2
        paste_y = (result_img.height - cloth_img.height) // 2
        result_img.paste(cloth_img, (paste_x, paste_y), cloth_img)
        
        # Save the result
        # Convert back to RGB to save as JPEG if needed, but saving as PNG to preserve transparency if any
        output_format = output_path.split('.')[-1].upper()
        if output_format == 'JPG':
             output_format = 'JPEG'
             result_img = result_img.convert('RGB')
             
        result_img.save(output_path, format=output_format)
        return True
    except Exception as e:
        print(f"Error processing try-on: {e}")
        return False

@app.post("/tryon")
async def tryon_endpoint(user_image: UploadFile = File(...), cloth_image: UploadFile = File(...)):
    """
    Endpoint for Virtual Try-On.
    Receives user_image and cloth_image, processes them, and returns the combined result.
    """
    if not user_image.filename or not cloth_image.filename:
        raise HTTPException(status_code=400, detail="Both user_image and cloth_image are required")
        
    # Generate unique filenames based on timestamp to avoid collisions
    timestamp = int(time.time() * 1000)
    user_ext = user_image.filename.split('.')[-1]
    cloth_ext = cloth_image.filename.split('.')[-1]
    
    user_path = UPLOAD_DIR / f"user_{timestamp}.{user_ext}"
    cloth_path = UPLOAD_DIR / f"cloth_{timestamp}.{cloth_ext}"
    output_path = OUTPUT_DIR / f"result_{timestamp}.png"
    
    # Save uploaded images
    try:
        with open(user_path, "wb") as buffer:
            shutil.copyfileobj(user_image.file, buffer)
            
        with open(cloth_path, "wb") as buffer:
            shutil.copyfileobj(cloth_image.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded files: {str(e)}")
        
    # Process the images
    # Run synchronously for now, could be pushed to a Celery queue for heavier models
    success = process_tryon(str(user_path), str(cloth_path), str(output_path))
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process try-on images")
        
    # Return the generated image
    return FileResponse(
        path=output_path, 
        media_type="image/png", 
        filename=f"tryon_result_{timestamp}.png"
    )

@app.get("/health")
def health_check():
    return {"status": "Try-On Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
