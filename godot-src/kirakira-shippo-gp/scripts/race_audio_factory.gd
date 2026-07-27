class_name RaceAudioFactory
extends RefCounted

## Original procedural audio for Kirakira Shippo Grand Prix.
## Every stream is generated in memory, so the game needs no external audio assets.

const SAMPLE_RATE := 22050
const PCM_PEAK := 32767.0


static func make_bgm() -> AudioStreamWAV:
	# Eight bars at 125 BPM: 32 beats / 15.36 seconds.
	const BPM := 125.0
	const BEATS := 32.0
	const ROOTS := [60, 57, 53, 55, 60, 57, 50, 55]
	const THIRD_OFFSETS := [4, 3, 4, 4, 4, 3, 3, 4]
	const MELODY_STEPS := [0, 2, 4, 7, 4, 2, 1, 2]

	var seconds_per_beat := 60.0 / BPM
	var duration := BEATS * seconds_per_beat
	var frame_count := int(round(duration * SAMPLE_RATE))
	var pcm := PackedByteArray()
	pcm.resize(frame_count * 4)

	for frame in range(frame_count):
		var time := float(frame) / float(SAMPLE_RATE)
		var beat := time / seconds_per_beat
		var bar := mini(int(floor(beat / 4.0)), 7)
		var beat_in_bar := fmod(beat, 4.0)
		var eighth := int(floor(beat * 2.0))
		var root_midi: int = ROOTS[bar]
		var third_midi: int = root_midi + THIRD_OFFSETS[bar]
		var fifth_midi := root_midi + 7

		var root_hz := _midi_to_hz(root_midi - 12)
		var bass_phase := TAU * root_hz * time
		var bass_gate := _pluck_envelope(fmod(beat, 1.0), 8.0)
		var bass := (
			sin(bass_phase) * 0.105
			+ sin(bass_phase * 2.0) * 0.025
		) * bass_gate

		var chord_step := int(floor(beat_in_bar * 2.0)) % 4
		var chord_midi: int
		match chord_step:
			0:
				chord_midi = root_midi + 12
			1:
				chord_midi = fifth_midi + 12
			2:
				chord_midi = third_midi + 12
			_:
				chord_midi = fifth_midi + 12
		var chord_hz := _midi_to_hz(chord_midi)
		var chord_phase := TAU * chord_hz * time
		var chord_gate := _pluck_envelope(fmod(beat * 2.0, 1.0), 5.8)
		var chord := (
			sin(chord_phase) * 0.085
			+ sin(chord_phase * 2.0) * 0.020
		) * chord_gate

		var melody_index := eighth % MELODY_STEPS.size()
		var melody_midi: int = root_midi + 12 + MELODY_STEPS[melody_index]
		var melody_hz := _midi_to_hz(melody_midi)
		var melody_phase := TAU * melody_hz * time
		var melody_gate := _pluck_envelope(fmod(beat * 2.0, 1.0), 7.4)
		var lead := (
			sin(melody_phase) * 0.075
			+ sin(melody_phase * 2.0) * 0.018
			+ sin(melody_phase * 3.0) * 0.009
		) * melody_gate

		var beat_phase := fmod(beat, 1.0)
		var kick := sin(TAU * (54.0 + 42.0 * exp(-beat_phase * 15.0)) * time)
		kick *= exp(-beat_phase * 13.0) * 0.115

		var half_beat_phase := fmod(beat * 2.0, 1.0)
		var hat_noise := _bright_noise(time)
		var hat := hat_noise * exp(-half_beat_phase * 34.0) * 0.024

		var snare_phase := fmod(beat + 3.0, 4.0)
		var snare := 0.0
		if snare_phase < 0.38:
			snare = _bright_noise(time * 1.031) * exp(-snare_phase * 11.0) * 0.037

		var pan := sin(TAU * 0.125 * beat)
		var edge_fade := minf(
			clampf(time / 0.035, 0.0, 1.0),
			clampf((duration - time) / 0.035, 0.0, 1.0)
		)
		var center := bass + kick + snare
		var left := center + chord * (0.92 - pan * 0.12) + lead * (0.82 + pan * 0.18) + hat
		var right := center + chord * (0.92 + pan * 0.12) + lead * (0.82 - pan * 0.18) - hat * 0.35
		_write_stereo_frame(pcm, frame, left * edge_fade, right * edge_fade)

	return _make_stream(pcm, frame_count, true, 0, frame_count)


static func make_drift_loop() -> AudioStreamWAV:
	# The first 0.10 seconds form a one-shot attack. The following one-second
	# section loops seamlessly while the player keeps drifting.
	var attack_seconds := 0.10
	var loop_seconds := 1.0
	var duration := attack_seconds + loop_seconds
	var frame_count := int(round(duration * SAMPLE_RATE))
	var loop_begin := int(round(attack_seconds * SAMPLE_RATE))
	var pcm := PackedByteArray()
	pcm.resize(frame_count * 4)

	for frame in range(frame_count):
		var time := float(frame) / float(SAMPLE_RATE)
		var attack := clampf(time / attack_seconds, 0.0, 1.0)
		var skid_phase := time - attack_seconds
		var wobble := 0.78 + 0.22 * sin(TAU * 4.0 * skid_phase)
		var grit_left := (
			sin(TAU * 730.0 * skid_phase + sin(TAU * 37.0 * skid_phase) * 2.4)
			+ sin(TAU * 1140.0 * skid_phase + 0.7) * 0.58
			+ sin(TAU * 1790.0 * skid_phase + 1.9) * 0.32
		) / 1.90
		var grit_right := (
			sin(TAU * 710.0 * skid_phase + sin(TAU * 41.0 * skid_phase) * 2.2)
			+ sin(TAU * 1090.0 * skid_phase + 1.2) * 0.58
			+ sin(TAU * 1810.0 * skid_phase + 2.5) * 0.32
		) / 1.90
		var rumble := sin(TAU * 92.0 * time + sin(TAU * 7.0 * time)) * 0.16
		var level := attack * wobble * 0.29
		_write_stereo_frame(
			pcm,
			frame,
			grit_left * level + rumble,
			grit_right * level + rumble
		)

	return _make_stream(pcm, frame_count, true, loop_begin, frame_count)


static func make_turbo() -> AudioStreamWAV:
	var duration := 0.72
	var frame_count := int(round(duration * SAMPLE_RATE))
	var pcm := PackedByteArray()
	pcm.resize(frame_count * 4)

	for frame in range(frame_count):
		var time := float(frame) / float(SAMPLE_RATE)
		var progress := time / duration
		var envelope := (
			clampf(progress / 0.055, 0.0, 1.0)
			* clampf((1.0 - progress) / 0.16, 0.0, 1.0)
		)
		var sweep_phase := TAU * (
			125.0 * time
			+ 0.5 * (920.0 - 125.0) * time * time / duration
		)
		var sparkle_phase := TAU * (
			460.0 * time
			+ 0.5 * (2300.0 - 460.0) * time * time / duration
		)
		var whoosh := _bright_noise(time * (0.62 + progress * 1.7))
		whoosh *= sin(PI * progress) * 0.12
		var engine := (
			sin(sweep_phase) * 0.31
			+ sin(sweep_phase * 2.0) * 0.105
			+ sin(sparkle_phase) * (0.035 + progress * 0.055)
		)
		var stereo_sway := sin(TAU * 3.0 * time) * 0.07
		_write_stereo_frame(
			pcm,
			frame,
			(engine * (1.0 - stereo_sway) + whoosh) * envelope,
			(engine * (1.0 + stereo_sway) - whoosh * 0.65) * envelope
		)

	return _make_stream(pcm, frame_count, false, 0, 0)


static func _make_stream(
	pcm: PackedByteArray,
	frame_count: int,
	should_loop: bool,
	loop_begin: int,
	loop_end: int
) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = SAMPLE_RATE
	stream.stereo = true
	stream.data = pcm
	if should_loop:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = loop_begin
		stream.loop_end = loop_end
	else:
		stream.loop_mode = AudioStreamWAV.LOOP_DISABLED
	return stream


static func _write_stereo_frame(
	pcm: PackedByteArray,
	frame: int,
	left: float,
	right: float
) -> void:
	var byte_offset := frame * 4
	pcm.encode_s16(byte_offset, _to_pcm16(left))
	pcm.encode_s16(byte_offset + 2, _to_pcm16(right))


static func _to_pcm16(sample: float) -> int:
	# A gentle soft limiter prevents harsh clipping when several voices coincide.
	var limited := sample / (1.0 + absf(sample))
	return int(round(clampf(limited, -0.94, 0.94) * PCM_PEAK))


static func _midi_to_hz(note: int) -> float:
	return 440.0 * pow(2.0, (float(note) - 69.0) / 12.0)


static func _pluck_envelope(phase: float, decay: float) -> float:
	var attack := clampf(phase / 0.035, 0.0, 1.0)
	return attack * exp(-phase * decay)


static func _bright_noise(time: float) -> float:
	# A deterministic cluster of inharmonic oscillators gives a noise-like
	# texture without random state, sample files, or discontinuities.
	return (
		sin(TAU * 2639.0 * time)
		+ sin(TAU * 3371.0 * time + 0.8)
		+ sin(TAU * 4219.0 * time + 2.1)
		+ sin(TAU * 5171.0 * time + 1.3)
	) * 0.25
