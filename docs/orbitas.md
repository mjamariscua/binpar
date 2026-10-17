# Órbitas de la Parte B: procedencia y verificación

Cada órbita de la galería tiene que **cerrar visiblemente tras un periodo**. Si no
cierra, es un bug. Este documento explica de dónde salen los números y cómo se
comprobó que cierran. Todo se puede reproducir:

```bash
pnpm test             # falla si alguna órbita no vuelve a su estado inicial
pnpm orbits:report    # tabla de cierre, energía y coste por resolución
pnpm orbits:sources   # comparación entre fuentes publicadas (tabla de abajo)
```

## Convenciones

- G = 1 y tres masas iguales a 1 en todas las órbitas.
- Las cuatro órbitas de Šuvakov & Dmitrašinović usan su configuración colineal
  isósceles: cuerpos en (−1, 0), (1, 0) y (0, 0); los dos exteriores con
  velocidad (vx, vy) y el central con −2·(vx, vy). Momento lineal y angular nulos.
- «Cierre» es la distancia euclídea en el espacio de fases (posiciones **y**
  velocidades de los tres cuerpos) entre el estado en t = 0 y en t = T.

## Valores usados

| Órbita | Descubrimiento | De dónde salen los números | vx, vy | T |
|---|---|---|---|---|
| Lagrange | Lagrange (1772) | Derivación propia: ω² = 3Gm/L³, lado L = √3 | rotación rígida, R = 1 | 2π·3^¼ ≈ 8.2691 |
| Figura de ocho | Moore (1993) | Chenciner & Montgomery (2000), fig. 1, valores de C. Simó | ver nota | 6.32591398 |
| Butterfly I | Šuvakov & Dmitrašinović (2013), I.A.1 | Li & Liao (2017), tabla S.XVII, I.A n.º 2 | 0.3068934205, 0.1255065670 | 6.2346748391 |
| Goggles | Šuvakov & Dmitrašinović (2013), I.B.5 | Li & Liao (2017), tabla S.XXI, I.B n.º 3 | 0.0833000718, 0.1278892555 | 10.4648495256 |
| Moth I | Šuvakov & Dmitrašinović (2013), I.B.1 | Li & Liao (2017), tabla S.XXI, I.B n.º 1 | 0.4644451728, 0.3960600146 | 14.8943051743 |
| Yin-Yang I | Šuvakov & Dmitrašinović (2013), II.C.2b | Li & Liao (2017), tabla S.XXV, II.C n.º 1 | 0.2827020949, 0.3272089716 | 10.9633031497 |

Figura de ocho: x₁ = −x₂ = (0.97000436, −0.24308753), x₃ = 0,
ẋ₃ = (−0.93240737, −0.86473146) y ẋ₁ = ẋ₂ = −ẋ₃/2.

Fuentes:
[Šuvakov & Dmitrašinović, arXiv:1303.0181](https://arxiv.org/abs/1303.0181) ·
[Li & Liao 2013, arXiv:1312.6796](https://arxiv.org/abs/1312.6796) ·
[Li & Liao 2017, arXiv:1705.00527](https://arxiv.org/abs/1705.00527) ·
[Chenciner & Montgomery, arXiv:math/0011268](https://arxiv.org/abs/math/0011268)

## Por qué no los valores «a 15 dígitos» de arXiv:1312.6796

El plan inicial era usar la Tabla I de arXiv:1312.6796 (Li & Liao, 2013), que
reproduce valores a 15 dígitos comunicados por Šuvakov. Antes de adoptarlos se
integraron todas las fuentes con un RK4 de 2·10⁶ pasos (deriva de energía
≤ 2·10⁻⁹, muy por debajo de los errores medidos). «Mejor retorno» es el mínimo
de la distancia al estado inicial cerca de T, refinado con búsqueda de sección
áurea sobre la interpolación de Hermite (`pnpm orbits:sources`):

| Órbita | Valores | Hueco en el T publicado | Mejor retorno (instante) |
|---|---|---|---|
| Butterfly I | PRL original, 5 díg. | 1.8·10⁻³ | 3.6·10⁻⁶ (t = 6.234660) |
| Butterfly I | arXiv:1312.6796, 15 díg. | 1.9·10⁻³ | 4.9·10⁻⁷ (t = 6.234670) |
| Butterfly I | **Li & Liao 2017, 10 díg.** | **3.3·10⁻¹⁰** | 3.2·10⁻¹¹ (t = 6.234675) |
| Goggles | PRL original, 5 díg. | 3.5·10⁻³ | 1.5·10⁻⁵ (t = 10.464852) |
| Goggles | arXiv:1312.6796, 15 díg. | 3.6·10⁻³ | 1.6·10⁻⁷ (t = 10.464850) |
| Goggles | **Li & Liao 2017, 10 díg.** | **2.8·10⁻⁹** | en el T publicado |
| Moth I | PRL original, 5 díg. | 3.6·10⁻⁴ | 2.1·10⁻⁴ (t = 14.894026) |
| Moth I | **Li & Liao 2017, 10 díg.** | **7.5·10⁻⁹** | 2.4·10⁻⁹ (t = 14.894305) |
| Yin-Yang I (a) | arXiv:1312.6796, 15 díg. | 1.0·10⁻³ | 1.4·10⁻⁶ (t = 17.328810) |
| Yin-Yang I (b) | arXiv:1312.6796, 15 díg. | 1.4·10⁻³ | 4.2·10⁻⁶ (t = 10.963251) |
| Yin-Yang I (b) | **Li & Liao 2017, 10 díg.** | **9.8·10⁻⁹** | en el T publicado |
| Figura de ocho | Chenciner & Montgomery, 8 díg. | 7.5·10⁻⁸ | en el T publicado |

Conclusiones:

1. **Los periodos de arXiv:1312.6796 no corresponden a sus condiciones
   iniciales.** Con esas mismas condiciones, el retorno ocurre ~10⁻³ antes o
   después del T publicado, justo en el T que da Li & Liao (2017). Integrar
   hasta el T publicado deja un hueco de 1–4·10⁻³: medio píxel o más.
2. **Más dígitos impresos no es más precisión.** Aun corrigiendo el periodo,
   los 15 dígitos de 2013 retornan a 10⁻⁷–10⁻⁶; los 10 dígitos de Li & Liao
   (2017), recalculados con precisión múltiple, cierran entre 50 y 1500 veces
   mejor y con su propio T.
3. Moth I no aparece en arXiv:1312.6796; la publicación original solo da
   5 dígitos, que dejan un hueco de 2·10⁻⁴.

`lib/orbits/catalog.test.ts` incluye esta comparación como test, para que la
decisión quede respaldada por el código y no solo por este documento.

Yin-Yang I tiene dos juegos de condiciones en la publicación original (II.C.2a y
II.C.2b) que describen la misma órbita reescalada en espacio y tiempo. Se usa
II.C.2b porque es la que Li & Liao (2017) recalcularon.

## Resolución de integración

Integrador: RK4 de paso fijo, h = T / (intervals · substeps). Se guardan
`intervals + 1` muestras y la animación interpola entre ellas con Hermite cúbico
(usa posiciones y velocidades, error O(h⁴)). Criterios, medidos con
`pnpm orbits:report`:

- **substeps**: el mínimo que da cierre ≤ 10⁻⁷ y |ΔE/E| ≤ 10⁻⁷.
- **intervals**: el mínimo (no menos de 1024) cuya interpolación se desvía
  ≤ 10⁻³ unidades, menos de medio píxel en la vista de detalle.

| Órbita | Pasos/periodo | Muestras | Cierre | \|ΔE/E\| máx. | Interpolación | Coste* |
|---|---|---|---|---|---|---|
| Lagrange | 16 384 | 1 024 | 1.4·10⁻¹³ | 6.8·10⁻¹⁵ | 3.7·10⁻¹² | 4 ms |
| Figura de ocho | 16 384 | 1 024 | 7.5·10⁻⁸ | 1.9·10⁻¹⁴ | 1.4·10⁻¹⁰ | 2 ms |
| Butterfly I | 524 288 | 4 096 | 6.6·10⁻⁸ | 1.0·10⁻⁸ | 2.3·10⁻⁴ | 49 ms |
| Goggles | 524 288 | 4 096 | 2.2·10⁻⁸ | 2.7·10⁻⁹ | 1.7·10⁻⁴ | 49 ms |
| Moth I | 65 536 | 1 024 | 3.9·10⁻⁸ | 3.1·10⁻⁹ | 1.8·10⁻⁴ | 6 ms |
| Yin-Yang I | 1 048 576 | 8 192 | 9.9·10⁻⁸ | 1.6·10⁻⁸ | 2.2·10⁻⁴ | 98 ms |

\* Node 24 en un Mac con Apple Silicon. Total ≈ 210 ms para las seis; en un móvil
medio cabe esperar varias veces más.

El coste lo dictan los **encuentros cercanos**: en Butterfly I, Goggles y
Yin-Yang I dos cuerpos pasan a ~0.01 unidades, y con paso fijo ese instante
obliga a usar un paso pequeño durante todo el periodo. Moth I, cuya distancia
mínima es ~0.08, necesita entre 8 y 16 veces menos pasos. Un integrador adaptativo o una
regularización (Sundman, Kustaanheimo–Stiefel) lo resolverían, a cambio de
perder las muestras equiespaciadas que permiten indexar la animación en O(1).

## Por qué se precomputa un periodo en vez de integrar en directo

Salvo la figura de ocho, estas órbitas son **inestables**: un error de 10⁻¹⁷
crece exponencialmente. Li & Liao (2013) muestran que Butterfly I se deshace
tras ~130 unidades de tiempo (unos 20 periodos) aunque se integre con 300
dígitos. Lagrange con masas iguales también es inestable (criterio de Routh).
Integrar en tiempo real enseñaría, al cabo de un rato, una órbita que ya no es
la solución periódica. Por eso la animación recorre un periodo precomputado
indexando con t mód T: cada vuelta es idéntica, el scrub es gratis y el error de
cierre está medido y acotado.
