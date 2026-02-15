#!/usr/bin/env python3
"""
Convert SVG icons to PNG format for App Store
Requires: pip install cairosvg pillow
"""

import cairosvg
from PIL import Image
import io
import os
import sys

def convert_svg_to_png(svg_path, png_path, size=1024):
    """Convert SVG to PNG with specified size"""
    try:
        # Convert SVG to PNG using cairosvg
        png_data = cairosvg.svg2png(
            url=svg_path, 
            parent_width=size, 
            parent_height=size,
            output_width=size,
            output_height=size
        )
        
        # Save PNG
        with open(png_path, 'wb') as f:
            f.write(png_data)
        
        print(f"✅ Converted {svg_path} -> {png_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error converting {svg_path}: {str(e)}")
        return False

def main():
    base_path = "/Users/ss/.openclaw/workspace-work/GuessUs/assets/appstore"
    
    # Convert Family icon
    family_svg = f"{base_path}/family/icons/app_icon_family.svg"
    family_png = f"{base_path}/family/icons/app_icon_family_1024x1024.png"
    
    # Convert Adult icon
    adult_svg = f"{base_path}/adult/icons/app_icon_adult.svg" 
    adult_png = f"{base_path}/adult/icons/app_icon_adult_1024x1024.png"
    
    print("🎨 Converting App Store icons...")
    
    success = True
    success &= convert_svg_to_png(family_svg, family_png, 1024)
    success &= convert_svg_to_png(adult_svg, adult_png, 1024)
    
    if success:
        print("✅ All icons converted successfully!")
    else:
        print("❌ Some conversions failed. Check dependencies:")
        print("pip install cairosvg pillow")
        sys.exit(1)

if __name__ == "__main__":
    main()