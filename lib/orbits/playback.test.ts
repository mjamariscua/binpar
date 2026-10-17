import { describe, expect, it } from "vitest";
import {
  INITIAL_PLAYBACK,
  MAX_FRAME_SECONDS,
  SECONDS_PER_PERIOD,
  advance,
  isSpeed,
  seek,
  type Playback,
} from "./playback";

const T = 6;

describe("advance", () => {
  it("a 1× recorre un periodo cada SECONDS_PER_PERIOD segundos, sea cual sea T", () => {
    let p: Playback = INITIAL_PLAYBACK;
    const frames = (SECONDS_PER_PERIOD / 2) * 60;
    for (let i = 0; i < frames; i++) p = advance(p, 1 / 60, T);
    expect(p.time).toBeCloseTo(T / 2, 9);
  });

  it("escala con la velocidad y da la vuelta al llegar a T", () => {
    const p = advance({ time: 5.5, playing: true, speed: 4 }, 0.05, T);
    // 0.05 s · 4 · (6 / 12) = 0.1  ⇒  5.6
    expect(p.time).toBeCloseTo(5.6, 12);
    const wrapped = advance({ time: 5.95, playing: true, speed: 4 }, 0.05, T);
    expect(wrapped.time).toBeCloseTo(0.05, 12);
  });

  it("en pausa no cambia nada (misma referencia: el store no notifica)", () => {
    const paused: Playback = { time: 1, playing: false, speed: 1 };
    expect(advance(paused, 0.016, T)).toBe(paused);
  });

  it("limita el paso de un fotograma para no saltar al volver a la pestaña", () => {
    const p = advance(INITIAL_PLAYBACK, 30, T);
    expect(p.time).toBeCloseTo((MAX_FRAME_SECONDS * T) / SECONDS_PER_PERIOD, 12);
  });
});

describe("seek / isSpeed", () => {
  it("seek lleva cualquier instante a [0, T)", () => {
    expect(seek(INITIAL_PLAYBACK, -1, T).time).toBe(5);
    expect(seek(INITIAL_PLAYBACK, T, T).time).toBe(0);
  });

  it("solo acepta las velocidades ofrecidas", () => {
    expect(isSpeed(2)).toBe(true);
    expect(isSpeed(3)).toBe(false);
  });
});
