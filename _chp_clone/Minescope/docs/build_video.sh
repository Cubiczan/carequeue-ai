#!/bin/bash
set -e

BASE="/home/z/my-project/minescope/docs"
FRAMES="$BASE/frames_hd"
AUDIO="$BASE/audio"
SLIDES="$BASE/slides"
FINAL="$BASE/demo-video-v2.mp4"

mkdir -p "$SLIDES"

# Durations for each slide (from audio)
D1=33.36
D2=32.92
D3=22.62
D4=22.96
D5=25.60
D6=27.18
D7=22.68
D8=35.36

# Create each slide video (static image + audio, no Ken Burns)
create_slide() {
    local idx=$1
    local dur=$2
    local in_img="$FRAMES/frame_${idx}.png"
    local in_aud="$AUDIO/slide${idx}.wav"
    local out_vid="$SLIDES/slide_${idx}.mp4"
    
    ffmpeg -y -hide_banner -loglevel error \
        -loop 1 -framerate 2 -i "$in_img" \
        -i "$in_aud" \
        -c:v libx264 -preset ultrafast -crf 28 \
        -pix_fmt yuv420p -r 24 \
        -c:a aac -b:a 128k -ar 44100 \
        -t "$dur" -shortest \
        "$out_vid"
    
    echo "Slide ${idx} done (${dur}s)"
}

echo "Building slides..."
create_slide "01" "$D1"
create_slide "02" "$D2"
create_slide "03" "$D3"
create_slide "04" "$D4"
create_slide "05" "$D5"
create_slide "06" "$D6"
create_slide "07" "$D7"
create_slide "08" "$D8"

# Create concat list
echo "Concatenating..."
> "$SLIDES/concat.txt"
for i in 01 02 03 04 05 06 07 08; do
    echo "file 'slide_${i}.mp4'" >> "$SLIDES/concat.txt"
done

# Concatenate all slides
ffmpeg -y -hide_banner -loglevel error \
    -f concat -safe 0 -i "$SLIDES/concat.txt" \
    -c copy \
    "$FINAL"

echo ""
echo "Final video: $FINAL"
ls -lh "$FINAL"
ffprobe -v quiet -show_entries format=duration,size -of default=noprint_wrappers=1 "$FINAL"
