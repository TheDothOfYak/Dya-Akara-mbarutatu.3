class_name DyaRng
extends RefCounted
## Deterministic RNG (mulberry32), bit-for-bit the same as the 2D game's U.Rng.
## The simulation may ONLY draw randomness from one of these.

const M32 := 0xFFFFFFFF
var a: int

func _init(seed_value: int = 1) -> void:
	a = seed_value & M32
	if a == 0:
		a = 0x9e3779b9

static func imul(x: int, y: int) -> int:
	return ((x & M32) * (y & M32)) & M32

func next() -> float:
	a = (a + 0x6D2B79F5) & M32
	var t := imul(a ^ (a >> 15), 1 | a)
	t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
	return float((t ^ (t >> 14)) & M32) / 4294967296.0

func range_f(lo: float, hi: float) -> float:
	return lo + next() * (hi - lo)

func int_in(lo: int, hi: int) -> int: # inclusive
	return int(floor(range_f(lo, hi + 1)))

func pick(arr: Array):
	return arr[int(floor(next() * arr.size()))]

func chance(p: float) -> bool:
	return next() < p

func gauss(mean: float, sd: float) -> float:
	var u1: float = max(next(), 1e-9)
	var u2 := next()
	return mean + sd * sqrt(-2.0 * log(u1)) * cos(2.0 * PI * u2)

## FNV-1a string hash, same as the 2D game's U.hashStr.
static func hash_str(s: String) -> int:
	var h := 2166136261
	for i in s.length():
		h ^= s.unicode_at(i)
		h = imul(h, 16777619)
	return h & M32
