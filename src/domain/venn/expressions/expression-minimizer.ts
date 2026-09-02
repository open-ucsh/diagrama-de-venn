import type { VennDiagram } from "../models";
import { createRegionId } from "../regions";

interface Implicant {
  bits: string;
  minterms: number[];
  used: boolean;
}

interface CoverSolution {
  implicants: Implicant[];
  literalCount: number;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((first, second) => first - second);
}

function createInitialImplicants(minterms: number[], setCount: number): Implicant[] {
  return minterms.map((minterm) => ({
    bits: minterm.toString(2).padStart(setCount, "0"),
    minterms: [minterm],
    used: false,
  }));
}

function combineBits(first: string, second: string): string | null {
  let differences = 0;
  let combined = "";

  for (let index = 0; index < first.length; index += 1) {
    const firstBit = first[index];
    const secondBit = second[index];

    if (firstBit === secondBit) {
      combined += firstBit;
      continue;
    }

    if (firstBit === "-" || secondBit === "-") {
      return null;
    }

    differences += 1;
    combined += "-";

    if (differences > 1) {
      return null;
    }
  }

  return differences === 1 ? combined : null;
}

function mergeDuplicateImplicants(implicants: Implicant[]): Implicant[] {
  const merged = new Map<string, Implicant>();

  implicants.forEach((implicant) => {
    const current = merged.get(implicant.bits);

    if (current) {
      current.minterms = uniqueNumbers([...current.minterms, ...implicant.minterms]);

      return;
    }

    merged.set(implicant.bits, {
      bits: implicant.bits,
      minterms: uniqueNumbers(implicant.minterms),
      used: false,
    });
  });

  return [...merged.values()];
}

function generatePrimeImplicants(minterms: number[], setCount: number): Implicant[] {
  let currentLevel = createInitialImplicants(minterms, setCount);
  const primeImplicants: Implicant[] = [];

  while (currentLevel.length > 0) {
    currentLevel.forEach((implicant) => {
      implicant.used = false;
    });

    const nextLevel: Implicant[] = [];

    for (let firstIndex = 0; firstIndex < currentLevel.length; firstIndex += 1) {
      const first = currentLevel[firstIndex];

      if (!first) {
        continue;
      }

      for (let secondIndex = firstIndex + 1; secondIndex < currentLevel.length; secondIndex += 1) {
        const second = currentLevel[secondIndex];

        if (!second) {
          continue;
        }

        const combinedBits = combineBits(first.bits, second.bits);

        if (combinedBits === null) {
          continue;
        }

        first.used = true;
        second.used = true;

        nextLevel.push({
          bits: combinedBits,
          minterms: uniqueNumbers([...first.minterms, ...second.minterms]),
          used: false,
        });
      }
    }

    currentLevel
      .filter((implicant) => !implicant.used)
      .forEach((implicant) => {
        primeImplicants.push({
          bits: implicant.bits,
          minterms: uniqueNumbers(implicant.minterms),
          used: false,
        });
      });

    currentLevel = mergeDuplicateImplicants(nextLevel);
  }

  return mergeDuplicateImplicants(primeImplicants);
}

function implicantCoversMinterm(implicant: Implicant, minterm: number, setCount: number): boolean {
  const mintermBits = minterm.toString(2).padStart(setCount, "0");

  return [...implicant.bits].every((bit, index) => {
    return bit === "-" || bit === mintermBits[index];
  });
}

function countImplicantLiterals(implicant: Implicant): number {
  return [...implicant.bits].filter((bit) => bit !== "-").length;
}

function isBetterSolution(candidate: CoverSolution, current: CoverSolution | null): boolean {
  if (current === null) {
    return true;
  }

  if (candidate.implicants.length !== current.implicants.length) {
    return candidate.implicants.length < current.implicants.length;
  }

  return candidate.literalCount < current.literalCount;
}

function selectBestCover(
  primeImplicants: Implicant[],
  minterms: number[],
  setCount: number,
): Implicant[] {
  const essentialImplicants: Implicant[] = [];

  minterms.forEach((minterm) => {
    const coveringImplicants = primeImplicants.filter((implicant) =>
      implicantCoversMinterm(implicant, minterm, setCount),
    );

    if (coveringImplicants.length !== 1) {
      return;
    }

    const essential = coveringImplicants[0];

    if (essential && !essentialImplicants.some((implicant) => implicant.bits === essential.bits)) {
      essentialImplicants.push(essential);
    }
  });

  const coveredByEssential = new Set<number>();

  essentialImplicants.forEach((implicant) => {
    minterms.forEach((minterm) => {
      if (implicantCoversMinterm(implicant, minterm, setCount)) {
        coveredByEssential.add(minterm);
      }
    });
  });

  const uncoveredMinterms = minterms.filter((minterm) => !coveredByEssential.has(minterm));

  if (uncoveredMinterms.length === 0) {
    return essentialImplicants;
  }

  const candidateImplicants = primeImplicants.filter(
    (implicant) =>
      !essentialImplicants.some((essential) => essential.bits === implicant.bits) &&
      uncoveredMinterms.some((minterm) => implicantCoversMinterm(implicant, minterm, setCount)),
  );

  let bestSolution: CoverSolution | null = null;

  function search(
    candidateIndex: number,
    selectedImplicants: Implicant[],
    coveredMinterms: Set<number>,
  ): void {
    const coversEverything = uncoveredMinterms.every((minterm) => coveredMinterms.has(minterm));

    if (coversEverything) {
      const candidateSolution: CoverSolution = {
        implicants: [...selectedImplicants],
        literalCount: selectedImplicants.reduce(
          (total, implicant) => total + countImplicantLiterals(implicant),
          0,
        ),
      };

      if (isBetterSolution(candidateSolution, bestSolution)) {
        bestSolution = candidateSolution;
      }

      return;
    }

    if (candidateIndex >= candidateImplicants.length) {
      return;
    }

    const candidate = candidateImplicants[candidateIndex];

    if (!candidate) {
      return;
    }

    search(candidateIndex + 1, selectedImplicants, coveredMinterms);

    const nextCoveredMinterms = new Set(coveredMinterms);

    uncoveredMinterms.forEach((minterm) => {
      if (implicantCoversMinterm(candidate, minterm, setCount)) {
        nextCoveredMinterms.add(minterm);
      }
    });

    search(candidateIndex + 1, [...selectedImplicants, candidate], nextCoveredMinterms);
  }

  search(0, [], new Set<number>());

  /*
   * TypeScript no detecta que search() modifica bestSolution
   * porque la asignación ocurre dentro de una función anidada.
   */
  const solution = bestSolution as CoverSolution | null;

  return [...essentialImplicants, ...(solution?.implicants ?? [])];
}

function getSelectedMinterms(diagram: VennDiagram, selectedRegionIds: string[]): number[] {
  const selectedIds = new Set(selectedRegionIds);
  const totalCombinations = 2 ** diagram.sets.length;
  const minterms: number[] = [];

  for (let combination = 0; combination < totalCombinations; combination += 1) {
    const setIds = diagram.sets
      .filter((_, setIndex) => (combination & (1 << setIndex)) !== 0)
      .map((set) => set.id);

    const regionId = createRegionId(setIds);

    if (selectedIds.has(regionId)) {
      minterms.push(combination);
    }
  }

  return minterms;
}

function formatImplicant(implicant: Implicant, diagram: VennDiagram): string {
  const literals: string[] = [];

  /*
   * Los bits binarios se escriben de izquierda a derecha,
   * pero el bit de A es el menos significativo.
   */
  diagram.sets.forEach((set, setIndex) => {
    const bitIndex = diagram.sets.length - 1 - setIndex;
    const bit = implicant.bits[bitIndex];

    if (bit === "-") {
      return;
    }

    literals.push(bit === "1" ? set.name : `${set.name}ᶜ`);
  });

  if (literals.length === 0) {
    return "U";
  }

  return literals.join(" ∩ ");
}

export function getMinimizedExpression(
  diagram: VennDiagram,
  selectedRegionIds: string[],
): string | null {
  if (selectedRegionIds.length === 0) {
    return null;
  }

  const setCount = diagram.sets.length;
  const totalRegionCount = 2 ** setCount;
  const minterms = getSelectedMinterms(diagram, selectedRegionIds);

  if (minterms.length === 0) {
    return null;
  }

  if (minterms.length === totalRegionCount) {
    return "U";
  }

  const primeImplicants = generatePrimeImplicants(minterms, setCount);

  const selectedImplicants = selectBestCover(primeImplicants, minterms, setCount);

  if (selectedImplicants.length === 0) {
    return null;
  }

  return selectedImplicants
    .map((implicant) => formatImplicant(implicant, diagram))
    .sort((first, second) => {
      const firstLiteralCount = first === "U" ? 0 : first.split(" ∩ ").length;

      const secondLiteralCount = second === "U" ? 0 : second.split(" ∩ ").length;

      if (firstLiteralCount !== secondLiteralCount) {
        return firstLiteralCount - secondLiteralCount;
      }

      return first.localeCompare(second);
    })
    .map((expression) => (expression.includes(" ∩ ") ? `(${expression})` : expression))
    .join(" ∪ ");
}
