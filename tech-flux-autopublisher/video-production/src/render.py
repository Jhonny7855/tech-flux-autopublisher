#!/usr/bin/env python3
"""
Tech Flux AutoPublisher 3.0 - Video Production Engine
Zero-budget Python script for rendering 9:16 YouTube Shorts (1080x1920, 30fps)
using FFmpeg, Pillow, and Piper TTS (or gTTS / espeak fallback).
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def log(message):
    print(f"[VideoEngine] {message}")

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        subprocess.run(["ffprobe", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        log("FFmpeg and FFprobe are available.")
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        log("ERROR: FFmpeg or FFprobe not found in system path!")
        return False

def generate_voiceover(text, output_audio_path):
    log(f"Generating voiceover for text: '{text[:30]}...'")
    # Try Piper TTS if available
    piper_bin = shutil_which("piper")
    if piper_bin:
        try:
            cmd = [piper_bin, "--model", "en_US-lessac-medium", "--output_file", output_audio_path]
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            process.communicate(input=text.encode('utf-8'))
            if process.returncode == 0 and os.path.exists(output_audio_path):
                log("Voiceover generated successfully using Piper TTS.")
                return True
        except Exception as e:
            log(f"Piper TTS failed: {e}")

    # Fallback to gTTS (Google Text-to-Speech)
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang='en', tld='us', slow=False)
        tts.save(output_audio_path)
        log("Voiceover generated successfully using gTTS.")
        return True
    except Exception as e:
        log(f"gTTS failed: {e}")

    # Final fallback: generate silent WAV audio using FFmpeg
    log("Warning: Falling back to silent audio track.")
    cmd = ["ffmpeg", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "5", output_audio_path, "-y"]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return True

def shutil_which(cmd):
    import shutil
    return shutil.which(cmd)

def create_scene_image(scene_index, title, visual_prompt, output_image_path):
    width, height = 1080, 1920
    img = Image.new("RGB", (width, height), color=(10, 15, 26)) # Tech dark background
    draw = ImageDraw.Draw(img)

    # Draw gradient overlay or geometric accents (Cyberpunk neon cyan theme)
    for i in range(0, height, 20):
        alpha = int(20 * (1 - i / height))
        draw.line([(0, i), (width, i)], fill=(0, 212, 170, alpha))

    # Draw central card / frame
    card_box = (80, 400, width - 80, height - 400)
    draw.rectangle(card_box, fill=(17, 24, 39), outline=(0, 212, 170), width=4)

    # Add text
    try:
        font_title = ImageFont.truetype("DejaVuSans-Bold.ttf", 60)
        font_body = ImageFont.truetype("DejaVuSans.ttf", 40)
    except IOError:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()

    # Draw Scene header
    draw.text((120, 460), f"TECH FLUX // SCENE {scene_index + 1}", fill=(0, 212, 170), font=font_title)

    # Draw title
    draw.text((120, 600), title[:40], fill=(255, 255, 255), font=font_title)

    # Draw visual prompt / description wrapped
    import textwrap
    wrapped_text = textwrap.fill(visual_prompt, width=35)
    draw.text((120, 750), wrapped_text, fill=(180, 210, 230), font=font_body)

    # Watermark channel name
    draw.text((120, height - 200), "TECH FLUX • DAILY TECH SHORTS", fill=(0, 212, 170), font=font_body)

    img.save(output_image_path, "PNG")
    log(f"Created scene image: {output_image_path}")

def render_short(storyboard_json_path, output_mp4_path):
    log(f"Starting video render from storyboard: {storyboard_json_path}")
    with open(storyboard_json_path, 'r') as f:
        storyboard = json.load(f)

    temp_dir = Path("temp_render")
    temp_dir.mkdir(exist_ok=True)

    scene_video_files = []

    for idx, scene in enumerate(storyboard.get("scenes", [])):
        img_path = str(temp_dir / f"scene_{idx}.png")
        audio_path = str(temp_dir / f"scene_{idx}.wav")
        scene_mp4 = str(temp_dir / f"scene_{idx}.mp4")

        # 1. Create visual image
        create_scene_image(idx, storyboard.get("title", "Tech Flux"), scene.get("visualPrompt", "Tech innovation"), img_path)

        # 2. Generate voiceover audio
        generate_voiceover(scene.get("narration", "Tech update"), audio_path)

        # Get audio duration
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
        )
        duration = float(probe.stdout.strip())
        if duration < 2.0:
            duration = 5.0 # Minimum scene duration

        # 3. Render scene video using FFmpeg (image + audio loop)
        cmd = [
            "ffmpeg", "-loop", "1", "-i", img_path, "-i", audio_path,
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p", "-shortest", "-t", str(duration),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            scene_mp4, "-y"
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        scene_video_files.append(scene_mp4)
        log(f"Rendered scene {idx + 1} ({duration:.2f}s)")

    # Concatenate all scenes
    concat_list_path = str(temp_dir / "concat_list.txt")
    with open(concat_list_path, "w") as f:
        for sf in scene_video_files:
            f.write(f"file '{Path(sf).absolute()}'\n")

    cmd_concat = [
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-c", "copy", output_mp4_path, "-y"
    ]
    subprocess.run(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    log(f"Successfully rendered complete YouTube Short: {output_mp4_path}")

    # Clean up temp dir
    for file in temp_dir.glob("*"):
        file.unlink()
    temp_dir.rmdir()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tech Flux AutoPublisher Video Renderer")
    parser.add_argument("--storyboard", required=True, help="Path to storyboard JSON file")
    parser.add_argument("--output", required=True, help="Path to output MP4 file")
    args = parser.parse_args()

    if not check_ffmpeg():
        sys.exit(1)

    render_short(args.storyboard, args.output)
