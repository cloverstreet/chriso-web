from music21 import stream, note, chord, tempo, meter, key, instrument

# Initialize the stream
s = stream.Score()

# Set the key to C Lydian
k = key.Key('C', 'lydian')

# Define the instruments
violin1 = instrument.Violin()
violin2 = instrument.Violin()
viola = instrument.Viola()
cello = instrument.Violoncello()

# Create parts
parts = [stream.Part(id='violin1'), stream.Part(id='violin2'), stream.Part(id='viola'), stream.Part(id='cello')]

# Assign instruments to parts
for p in parts:
    if p.id == 'violin1':
        p.append(violin1)
    elif p.id == 'violin2':
        p.append(violin2)
    elif p.id == 'viola':
        p.append(viola)
    elif p.id == 'cello':
        p.append(cello)
    p.append(k)

# Define the tempo
bpm = 60
t = tempo.MetronomeMark(number=bpm)

# Append the tempo to the first part
parts[0].append(t)

# Create a measure
def create_measure(duration, pitch_lists, hocket_pattern=None):
    measure_parts = [stream.Measure() for _ in range(len(pitch_lists))]
    for idx, pitch_list in enumerate(pitch_lists):
        for i, p in enumerate(pitch_list):
            if hocket_pattern and hocket_pattern[idx][i % len(hocket_pattern[idx])] == 0:
                n = note.Rest(quarterLength=duration)
            else:
                n = note.Note(p, quarterLength=duration)
            measure_parts[idx].append(n)
    return measure_parts

# Lydian mode notes (C, D, E, F#, G, A, B)
lydian_notes = ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5']

# Define the chord to end with (super ultramajor chord)
end_chord_notes = ['C4', 'E4', 'G4', 'B4', 'D5', 'F#5', 'A5']
end_chord = chord.Chord(end_chord_notes)

# Initialize the duration and measure count
duration = 4.0  # whole note
total_measures = 32
measure_count = 0

# Generate the music
for measure_index in range(total_measures):
    pitches = ['C4', 'C4', 'C4', 'C4']  # Start with unison
    if measure_index > 0:
        step = measure_index * 4
        for i in range(4):
            index = (step + i) % len(lydian_notes)
            if i % 2 == 0:
                pitches[i] = lydian_notes[index]
            else:
                pitches[i] = lydian_notes[-(index + 1)]
    
    durations = [duration] * 4  # All notes have the same duration initially
    # Hocket pattern: 1 means play, 0 means rest
    hocket_pattern = [
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1]
    ]
    measures = create_measure(duration, [pitches]*4, hocket_pattern)
    for idx, p in enumerate(parts):
        p.append(measures[idx])
    if measure_index % 4 == 3 and duration > 0.25:
        duration /= 2  # notes get faster

# Add the ending chord
end_measure = stream.Measure()
end_measure.append(end_chord)
for p in parts:
    p.append(end_measure)

# Add parts to the score
for p in parts:
    s.append(p)

# Save to MusicXML
s.write('musicxml', fp='composition.xml')

print("MusicXML file 'composition.xml' generated successfully.")