import Link from "next/link";
import { AppleMoon } from "@/components/gravity/apple-moon";
import { Chapter, Prose } from "@/components/gravity/chapter";
import { LiveFormula } from "@/components/gravity/live-formula";
import { OrbitSandbox } from "@/components/gravity/orbit-sandbox";
import { Tex } from "@/components/gravity/tex";
import { TutorSection } from "@/components/tutor/tutor-section";

const CHAPTERS = [
  { id: "manzana-y-luna", title: "La manzana y la Luna" },
  { id: "la-formula", title: "La fórmula, viva" },
  { id: "lanzar", title: "Lanzar un satélite" },
  { id: "tutor", title: "Tu tutor" },
] as const;

/**
 * Parte A: la ley de gravitación universal en cuatro capítulos que se leen
 * con scroll. Cada uno añade una idea y un experimento; el último junta todo
 * en un laboratorio que el tutor de IA puede manejar.
 */
export default function GravityPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="flex min-h-[80vh] flex-col justify-center py-16">
        <p className="font-mono text-sm tracking-widest text-primary uppercase">Ley de gravitación universal</p>
        <h1 className="mt-4 font-heading text-[clamp(5rem,18vw,13rem)] leading-[0.85] italic">Caída</h1>
        <p className="mt-8 max-w-2xl text-xl leading-relaxed text-foreground/90 sm:text-2xl">
          Cuenta la historia que una manzana hizo pensar a Isaac Newton: si la manzana cae, ¿por qué no cae la Luna?
          La respuesta cabe en una línea y explica desde las mareas hasta las órbitas de los planetas. Vamos a
          descubrirla tocándola.
        </p>
        <nav aria-label="Capítulos" className="mt-12">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="flex h-full items-baseline gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:border-primary/60"
                >
                  <span className="font-mono text-sm text-primary">{i + 1}</span>
                  <span>{c.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <Chapter id="manzana-y-luna" number={1} title="La manzana y la Luna caen por lo mismo">
        <Prose>
          <p>
            Una manzana cae porque la Tierra tira de ella. La idea de Newton fue que esa misma atracción llega hasta
            la Luna, más débil cuanto más lejos. La Luna también cae hacia la Tierra; pero a la vez avanza de lado a
            un kilómetro por segundo y, mientras cae, la superficie se curva por debajo. Nunca llega.
          </p>
        </Prose>
        <div className="mt-10">
          <AppleMoon />
        </div>
        <Prose>
          <p className="mt-10">
            Newton hizo esta cuenta: la Luna está unas 60 veces más lejos del centro de la Tierra que la manzana, y
            cae 60 × 60 = 3600 veces menos en el mismo tiempo. La atracción se debilita con el{" "}
            <strong>cuadrado</strong> de la distancia:
          </p>
        </Prose>
        <Tex display>{String.raw`a = g\left(\frac{R_\oplus}{d}\right)^{2}`}</Tex>
        <Prose>
          <p className="text-base text-muted-foreground">
            <Tex>g</Tex> es la gravedad en la superficie (9.81 m/s²), <Tex>R_\oplus</Tex> el radio de la Tierra y{" "}
            <Tex>d</Tex> la distancia al centro.
          </p>
        </Prose>
      </Chapter>

      <Chapter id="la-formula" number={2} title="La fórmula, viva">
        <Prose>
          <p>
            La atracción no depende solo de la distancia. Dos cuerpos cualesquiera se atraen con una fuerza que crece
            con el producto de sus masas y que se divide por el cuadrado de la distancia que los separa. Eso es toda
            la ley. Toca los símbolos.
          </p>
        </Prose>
        <div className="mt-10">
          <LiveFormula />
        </div>
        <Prose>
          <ul className="mt-10 list-disc space-y-2 pl-5">
            <li>Duplica una masa: la fuerza se duplica.</li>
            <li>Duplica la distancia: la fuerza se divide entre cuatro.</li>
            <li>
              Las dos flechas miden siempre lo mismo: la Luna tira de la Tierra tanto como la Tierra de la Luna. Ese
              tirón sobre los océanos es lo que llamamos mareas.
            </li>
          </ul>
        </Prose>
      </Chapter>

      <Chapter id="lanzar" number={3} title="Lanzar un satélite">
        <Prose>
          <p>
            Si la Luna cae sin llegar nunca, podemos hacer lo mismo. Newton imaginó un cañón en lo alto de una
            montaña: cuanto más rápido dispara, más lejos cae la bala, hasta que va tan rápido que su caída sigue la
            curva de la Tierra. Pruébalo con un satélite lanzado a un radio terrestre de altura.
          </p>
        </Prose>
        <div className="mt-10">
          <OrbitSandbox />
        </div>
        <Prose>
          <p className="mt-10">
            Para una órbita circular, la gravedad tiene que aportar justo la fuerza que curva la trayectoria. Para
            escapar, la energía del movimiento tiene que superar a la de la atracción:
          </p>
        </Prose>
        <Tex display>{String.raw`v_{\text{circular}} = \sqrt{\frac{GM}{r}} \qquad v_{\text{escape}} = \sqrt{2}\,v_{\text{circular}}`}</Tex>
      </Chapter>

      <Chapter id="tutor" number={4} title="Tu tutor">
        <TutorSection />
      </Chapter>

      <footer className="border-t border-border/60 py-20">
        <p className="font-heading text-4xl sm:text-5xl">¿Y si son tres?</p>
        <p className="mt-4 max-w-prose text-lg text-muted-foreground">
          Con dos cuerpos, la ley da una solución exacta. Con tres, no existe ninguna fórmula general; solo
          coreografías concretas que se repiten.
        </p>
        <Link
          href="/tres-cuerpos"
          scroll={false}
          className="mt-6 inline-flex rounded-lg border border-primary/60 px-5 py-3 text-lg text-primary transition-colors hover:bg-primary/10"
        >
          Ver la galería de tres cuerpos →
        </Link>
      </footer>
    </main>
  );
}
