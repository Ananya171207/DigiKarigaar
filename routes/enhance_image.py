import os
import io
import uuid
 
import numpy as np
import cv2
from flask import Blueprint, request, jsonify, current_app
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter, ImageOps
 
# ---------------------------------------------------------------------------
# Blueprint (contract-locked name)
# ---------------------------------------------------------------------------
enhance_bp = Blueprint("enhance_bp", __name__)
 
# Cap the longest side of the working image to keep peak memory usage
# predictable.
MAX_DIMENSION = 1024
 
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
 
# GrabCut cost scales with pixel count - run it on a small downscaled proxy
# for speed, then upscale just the resulting mask back to full resolution.
GRABCUT_PROXY_DIM = 320
 
# ---------------------------------------------------------------------------
# Real background photos. Swap these files for your own photos any time -
# no code changes needed. Paths are relative to the project root.
# ---------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKGROUNDS_DIR = os.path.join(BASE_DIR, "background")
CLEAN_BG_PATH = os.path.join(BACKGROUNDS_DIR, "clean_bg.png")
TABLE_BG_PATH = os.path.join(BACKGROUNDS_DIR, "table_bg.png")
WALL_FLOOR_BG_PATH = os.path.join(BACKGROUNDS_DIR, "wall_floor_bg.png")
 
OUTPUT_SIZE = (1000, 1000)
 
 
def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
 
 
def _resize_if_needed(pil_img, max_dim=MAX_DIMENSION):
    """Downscale large uploads in-place to control memory usage."""
    w, h = pil_img.size
    if max(w, h) <= max_dim:
        return pil_img
    scale = max_dim / float(max(w, h))
    new_size = (int(w * scale), int(h * scale))
    return pil_img.resize(new_size, Image.LANCZOS)
 
 
# ---------------------------------------------------------------------------
# Enhancement
# ---------------------------------------------------------------------------
def enhance_product_quality(pil_img):
    """
    Apply Pillow ImageEnhance adjustments to make the product image look
    crisper and more vivid, as expected for e-commerce listings.
    """
    img = pil_img.convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(1.25)
    img = ImageEnhance.Color(img).enhance(1.15)
    img = ImageEnhance.Sharpness(img).enhance(1.3)
    return img
 
 
# ---------------------------------------------------------------------------
# Classical-CV foreground cutout (no AI model - keeps RAM low)
# ---------------------------------------------------------------------------
def get_foreground_mask(pil_img, inset_ratio=0.08, iterations=3):
    """
    Returns a single-channel uint8 numpy mask (0-255), same size as pil_img,
    where 255 = product/foreground and 0 = background, using OpenCV's
    GrabCut algorithm. Assumes the product is roughly centered.
 
    Runs on a small downscaled proxy for speed, then upscales the mask.
    """
    full_w, full_h = pil_img.size
 
    scale = GRABCUT_PROXY_DIM / float(max(full_w, full_h))
    if scale < 1.0:
        proxy_size = (max(1, int(full_w * scale)), max(1, int(full_h * scale)))
        proxy_img = pil_img.resize(proxy_size, Image.BILINEAR)
    else:
        proxy_img = pil_img
 
    img_bgr = cv2.cvtColor(np.array(proxy_img.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = img_bgr.shape[:2]
 
    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
 
    margin_x = int(w * inset_ratio)
    margin_y = int(h * inset_ratio)
    rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)
 
    try:
        cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, iterations, cv2.GC_INIT_WITH_RECT)
        binary_mask = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    except cv2.error:
        binary_mask = np.full((h, w), 255, dtype=np.uint8)
 
    if scale < 1.0:
        binary_mask = cv2.resize(binary_mask, (full_w, full_h), interpolation=cv2.INTER_LINEAR)
 
    return binary_mask
 
 
def build_cutout(pil_img, mask_arr, feather=4):
    """
    Combines pil_img (RGB) with mask_arr (0-255) into an RGBA cutout, with
    the mask edges softened (feathered) to hide some of GrabCut's rougher,
    more jagged boundary compared to a neural segmentation model.
    """
    k = max(1, (feather * 2 + 1) | 1)
    feathered = cv2.GaussianBlur(mask_arr.astype(np.float32), (k, k), 0)
    feathered = np.clip(feathered, 0, 255).astype(np.uint8)
 
    rgb = np.array(pil_img.convert("RGB"))
    rgba = np.dstack([rgb, feathered])
    return Image.fromarray(rgba, mode="RGBA")
 
 
# ---------------------------------------------------------------------------
# Scene / background helpers
# ---------------------------------------------------------------------------
def _load_background_photo(path, size=OUTPUT_SIZE):
    """
    Loads a real background photo and "cover"-fits it to `size`: scales up
    to fully cover the frame (no letterboxing), then center-crops any
    overflow. This avoids stretching/distorting your photo.
    """
    bg = Image.open(path).convert("RGB")
    bg = ImageOps.fit(bg, size, method=Image.LANCZOS, centering=(0.5, 0.5))
    return bg
 
 
def _paste_on_surface(background, cutout_rgba, rest_y_ratio=0.80, max_width_ratio=0.70, max_height_ratio=0.70):
    """
    Pastes an RGBA product cutout onto `background` so it looks like it's
    resting ON a surface, rather than floating dead-center.
    """
    bg_w, bg_h = background.size
    fg = cutout_rgba.copy()

    # 1. CROP TRANSPARENT PADDING: Removes empty space so the pot itself is measured
    bbox = fg.getbbox()
    if bbox:
        fg = fg.crop(bbox)

    fw, fh = fg.size

    # 2. CALCULATE MAX ALLOWED SIZE (Width & Height)
    max_fg_w = int(bg_w * max_width_ratio)
    max_fg_h = int(bg_h * max_height_ratio)

    # 3. SCALE UP OR DOWN comfortably without over-shrinking
    scale_w = max_fg_w / float(fw)
    scale_h = max_fg_h / float(fh)
    scale = min(scale_w, scale_h)  # Fit inside max box while keeping aspect ratio

    fg = fg.resize((max(1, int(fw * scale)), max(1, int(fh * scale))), Image.LANCZOS)
    fw, fh = fg.size

    # 4. POSITION ON SURFACE
    rest_y = int(bg_h * rest_y_ratio)
    pos_x = (bg_w - fw) // 2
    pos_y = rest_y - fh

    background = background.copy()
    background.paste(fg, (pos_x, pos_y), fg)
    return background, (pos_x, pos_y, fw, fh)
 
def _add_contact_shadow(background, box, opacity=70):
    """Soft elliptical shadow right where the product's base meets the
    surface, so it doesn't look like a sticker pasted on top."""
    pos_x, pos_y, fw, fh = box
    bg_w, bg_h = background.size
 
    shadow_layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow_layer)
 
    shadow_w = int(fw * 0.8)
    shadow_h = int(shadow_w * 0.16)
    cx = pos_x + fw // 2
    cy = pos_y + fh
 
    draw.ellipse(
        [cx - shadow_w // 2, cy - shadow_h // 2, cx + shadow_w // 2, cy + shadow_h // 2],
        fill=(0, 0, 0, opacity),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=shadow_w * 0.05))
 
    result = background.convert("RGBA")
    result = Image.alpha_composite(result, shadow_layer)
    return result.convert("RGB")
 
 
def create_table_scene(cutout_rgba, size=OUTPUT_SIZE):
    """Composite the product onto your real table photo."""
    background = _load_background_photo(TABLE_BG_PATH, size)
    
    # rest_y_ratio=0.95 anchors the bottom of the pot near the bottom edge
    background, box = _paste_on_surface(
        background, cutout_rgba, rest_y_ratio=0.92, max_width_ratio=0.60, max_height_ratio=0.70
    )
    background = _add_contact_shadow(background, box, opacity=90)
    return background


def create_wall_floor_scene(cutout_rgba, size=OUTPUT_SIZE):
    """Composite the product onto your real wall/floor photo."""
    background = _load_background_photo(WALL_FLOOR_BG_PATH, size)
    
    # rest_y_ratio=0.96 places the pot base directly on the wooden floor line
    background, box = _paste_on_surface(
        background, cutout_rgba, rest_y_ratio=0.96, max_width_ratio=0.60, max_height_ratio=0.60
    )
    background = _add_contact_shadow(background, box, opacity=80)
    return background


def create_solid_background(cutout_rgba, size=OUTPUT_SIZE, fallback_color=(255, 255, 255)):
    """Composite onto your clean backdrop photo or white background."""
    if os.path.exists(CLEAN_BG_PATH):
        background = _load_background_photo(CLEAN_BG_PATH, size)
    else:
        background = Image.new("RGB", size, fallback_color)
    
    background, box = _paste_on_surface(
        background, cutout_rgba, rest_y_ratio=0.95, max_width_ratio=0.75, max_height_ratio=0.85
    )
    background = _add_contact_shadow(background, box, opacity=60)
    return background
 
# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@enhance_bp.route("/api/enhance-image", methods=["POST"])
def enhance_image():
    if "image" not in request.files:
        return jsonify({"error": "Missing 'image' file in form-data"}), 400
 
    file = request.files["image"]
 
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
 
    if not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use png/jpg/jpeg/webp"}), 400
 
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    image_id = uuid.uuid4().hex[:12]
 
    try:
        raw_bytes = file.read()
        original_img = Image.open(io.BytesIO(raw_bytes))
        original_img = _resize_if_needed(original_img)
        original_img = original_img.convert("RGB")
 
        # 1. Enhance product quality
        enhanced_img = enhance_product_quality(original_img)
 
        # 2. Get a foreground mask via classical CV (no AI model - low RAM)
        mask_arr = get_foreground_mask(enhanced_img)
 
        # 3. Build an RGBA cutout with feathered edges
        cutout = build_cutout(enhanced_img, mask_arr)
 
        # 4. Composite onto YOUR real photos
        solid_scene = create_solid_background(cutout)
        table_scene = create_table_scene(cutout)
        wall_scene = create_wall_floor_scene(cutout)
 
        enhanced_filename = f"enhanced_{image_id}.jpg"
        table_filename = f"table_{image_id}.jpg"
        wall_filename = f"wall_{image_id}.jpg"
 
        solid_scene.save(os.path.join(upload_folder, enhanced_filename), "JPEG", quality=90)
        table_scene.save(os.path.join(upload_folder, table_filename), "JPEG", quality=90)
        wall_scene.save(os.path.join(upload_folder, wall_filename), "JPEG", quality=90)
 
        for img_obj in (original_img, enhanced_img, cutout, solid_scene, table_scene, wall_scene):
            img_obj.close()
 
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Image processing failed: {str(exc)}"}), 500
 
    response_payload = {
        "enhanced_image_url": f"/uploads/{enhanced_filename}",
        "additional_scenes": {
            "table_view": f"/uploads/{table_filename}",
            "wall_floor_view": f"/uploads/{wall_filename}",
        },
    }
    return jsonify(response_payload), 200