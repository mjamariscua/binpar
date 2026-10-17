import { describe, expect, it } from "vitest";
import { formatInteger, formatScientific, formatValue } from "./format";

describe("formato de cifras", () => {
  it("formatValue quita ceros de relleno y el ruido de redondeo", () => {
    expect(formatValue(0.125506567)).toBe("0.125506567");
    expect(formatValue(-2 * 0.3068934205)).toBe("-0.613786841");
    expect(formatValue(6.123233995736766e-17)).toBe("0");
    expect(formatValue(-2.17019414, 4)).toBe("-2.17");
  });

  it("formatScientific usa superíndices", () => {
    expect(formatScientific(6.6e-8)).toBe("6.6·10⁻⁸");
    expect(formatScientific(1.25e12, 3)).toBe("1.25·10¹²");
  });

  it("formatInteger separa los miles con espacio fino", () => {
    expect(formatInteger(524288)).toBe("524 288");
    expect(formatInteger(1048576)).toBe("1 048 576");
    expect(formatInteger(999)).toBe("999");
  });
});
