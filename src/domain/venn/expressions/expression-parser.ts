import {
  getRegionIdsFromMask,
  getSetMask,
  getUniverseMask,
} from "@/domain/venn/expressions/expression-masks";
import type { VennDiagram } from "@/domain/venn/models";

export { getRegionIdsFromMask } from "@/domain/venn/expressions/expression-masks";

type Operator = "union" | "intersection" | "difference" | "symmetric-difference" | "complement";

type Token =
  | {
      type: "identifier";
      value: string;
      position: number;
    }
  | {
      type: "operator";
      value: Operator;
      position: number;
    }
  | {
      type: "left-parenthesis" | "right-parenthesis" | "empty-set" | "complement-postfix" | "end";
      position: number;
    };

interface SetIdentifier {
  name: string;
  normalizedName: string;
}

export interface ParsedVennExpression {
  mask: number;
  regionIds: string[];
}

const OPERATORS: ReadonlyMap<string, Operator> = new Map([
  ["∪", "union"],
  ["|", "union"],
  ["∩", "intersection"],
  ["&", "intersection"],
  ["\\", "difference"],
  ["-", "difference"],
  ["△", "symmetric-difference"],
  ["Δ", "symmetric-difference"],
  ["^", "symmetric-difference"],
  ["!", "complement"],
]);

const SYMBOL_TOKENS: ReadonlyMap<string, Token["type"]> = new Map([
  ["(", "left-parenthesis"],
  [")", "right-parenthesis"],
  ["∅", "empty-set"],
  ["'", "complement-postfix"],
  ["′", "complement-postfix"],
  ["ᶜ", "complement-postfix"],
]);

const IDENTIFIER_CHARACTER = /[\p{L}\p{N}_]/u;
const SET_NAME_PATTERN = /^[\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*$/u;
const WHITESPACE = /\s/u;

export class VennExpressionError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);

    this.name = "VennExpressionError";
    this.position = position;
  }
}

function normalizeIdentifier(value: string): string {
  return value.toLowerCase();
}

function isIdentifierCharacter(character: string): boolean {
  return character !== "ᶜ" && character !== "Δ" && IDENTIFIER_CHARACTER.test(character);
}

function getSetIdentifiers(diagram: VennDiagram): SetIdentifier[] {
  return (
    diagram.sets
      .map((set) => set.name)
      .filter(
        (name) =>
          name.length > 0 &&
          name.trim() === name &&
          SET_NAME_PATTERN.test(name) &&
          !name.includes("ᶜ") &&
          !name.includes("Δ") &&
          normalizeIdentifier(name) !== "u",
      )
      .map((name) => ({
        name,
        normalizedName: normalizeIdentifier(name),
      }))
      // Evita interpretar "Numeros reales" como el conjunto "Numeros".
      .sort((first, second) => second.name.length - first.name.length)
  );
}

function findSetIdentifier(
  source: string,
  position: number,
  identifiers: readonly SetIdentifier[],
): SetIdentifier | undefined {
  return identifiers.find(({ name, normalizedName }) => {
    const candidate = source.slice(position, position + name.length);

    if (normalizeIdentifier(candidate) !== normalizedName) {
      return false;
    }

    const nextCharacter = source[position + name.length] ?? "";

    return !isIdentifierCharacter(nextCharacter);
  });
}

function tokenize(source: string, diagram: VennDiagram): Token[] {
  const tokens: Token[] = [];
  const identifiers = getSetIdentifiers(diagram);
  let position = 0;

  while (position < source.length) {
    const character = source[position];

    if (character === undefined) {
      break;
    }

    if (WHITESPACE.test(character)) {
      position += 1;
      continue;
    }

    const symbolType = SYMBOL_TOKENS.get(character);

    if (
      symbolType === "left-parenthesis" ||
      symbolType === "right-parenthesis" ||
      symbolType === "empty-set" ||
      symbolType === "complement-postfix"
    ) {
      tokens.push({ type: symbolType, position });
      position += 1;
      continue;
    }

    const operator = OPERATORS.get(character);

    if (operator !== undefined) {
      tokens.push({
        type: "operator",
        value: operator,
        position,
      });
      position += 1;
      continue;
    }

    if (!isIdentifierCharacter(character)) {
      throw new VennExpressionError(`El símbolo “${character}” no es válido.`, position);
    }

    const knownIdentifier = findSetIdentifier(source, position, identifiers);

    if (knownIdentifier) {
      tokens.push({
        type: "identifier",
        value: knownIdentifier.name,
        position,
      });
      position += knownIdentifier.name.length;
      continue;
    }

    const start = position;

    while (position < source.length && isIdentifierCharacter(source[position] ?? "")) {
      position += 1;
    }

    tokens.push({
      type: "identifier",
      value: source.slice(start, position),
      position: start,
    });
  }

  tokens.push({
    type: "end",
    position: source.length,
  });

  return tokens;
}

class ExpressionParser {
  private readonly tokens: Token[];
  private readonly endToken: Token;
  private readonly universeMask: number;
  private readonly setMasks: Map<string, number>;
  private index = 0;

  constructor(diagram: VennDiagram, source: string) {
    const setCount = diagram.sets.length;

    this.tokens = tokenize(source, diagram);
    this.endToken = { type: "end", position: source.length };
    this.universeMask = getUniverseMask(setCount);
    this.setMasks = new Map(
      diagram.sets.map((set, index) => [
        normalizeIdentifier(set.name),
        getSetMask(index, setCount),
      ]),
    );
  }

  parse(): number {
    const mask = this.parseUnion();
    const token = this.current();

    if (token.type !== "end") {
      throw new VennExpressionError(
        "Hay contenido adicional al final de la fórmula.",
        token.position,
      );
    }

    return mask;
  }

  private current(): Token {
    return this.tokens[this.index] ?? this.endToken;
  }

  private advance(): void {
    this.index += 1;
  }

  private matchOperator(operator: Operator): boolean {
    const token = this.current();

    if (token.type !== "operator" || token.value !== operator) {
      return false;
    }

    this.advance();

    return true;
  }

  private complement(mask: number): number {
    return this.universeMask ^ mask;
  }

  // De menor a mayor precedencia:
  // unión, diferencia simétrica, diferencia, intersección, complemento.
  private parseUnion(): number {
    let mask = this.parseSymmetricDifference();

    while (this.matchOperator("union")) {
      mask |= this.parseSymmetricDifference();
    }

    return mask;
  }

  private parseSymmetricDifference(): number {
    let mask = this.parseDifference();

    while (this.matchOperator("symmetric-difference")) {
      mask ^= this.parseDifference();
    }

    return mask;
  }

  private parseDifference(): number {
    let mask = this.parseIntersection();

    while (this.matchOperator("difference")) {
      mask &= this.complement(this.parseIntersection());
    }

    return mask;
  }

  private parseIntersection(): number {
    let mask = this.parseComplement();

    while (this.matchOperator("intersection")) {
      mask &= this.parseComplement();
    }

    return mask;
  }

  private parseComplement(): number {
    if (this.matchOperator("complement")) {
      return this.complement(this.parseComplement());
    }

    let mask = this.parsePrimary();

    while (this.current().type === "complement-postfix") {
      this.advance();
      mask = this.complement(mask);
    }

    return mask;
  }

  private parseParenthesizedExpression(): number {
    this.advance();

    const mask = this.parseUnion();
    const closingToken = this.current();

    if (closingToken.type !== "right-parenthesis") {
      throw new VennExpressionError("Falta cerrar el paréntesis.", closingToken.position);
    }

    this.advance();

    return mask;
  }

  private resolveIdentifier(value: string, position: number): number {
    const name = normalizeIdentifier(value);

    if (name === "u") {
      return this.universeMask;
    }

    const mask = this.setMasks.get(name);

    if (mask === undefined) {
      throw new VennExpressionError(`No existe el conjunto “${value}”.`, position);
    }

    return mask;
  }

  private parsePrimary(): number {
    const token = this.current();

    if (token.type === "left-parenthesis") {
      return this.parseParenthesizedExpression();
    }

    if (token.type === "empty-set") {
      this.advance();

      return 0;
    }

    if (token.type === "identifier") {
      this.advance();

      return this.resolveIdentifier(token.value, token.position);
    }

    if (token.type === "end") {
      throw new VennExpressionError("La fórmula está incompleta.", token.position);
    }

    throw new VennExpressionError("Se esperaba un conjunto o un paréntesis.", token.position);
  }
}

export function parseVennExpression(diagram: VennDiagram, source: string): ParsedVennExpression {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    throw new VennExpressionError("Escribe una fórmula.", 0);
  }

  const parser = new ExpressionParser(diagram, trimmedSource);
  const mask = parser.parse();

  return {
    mask,
    regionIds: getRegionIdsFromMask(diagram, mask),
  };
}
