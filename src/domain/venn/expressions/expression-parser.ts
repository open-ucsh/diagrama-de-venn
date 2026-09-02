import type { VennDiagram } from "../models";
import { getVennRegions } from "../regions";
import { getSetMask, getUniverseMask } from "./expression-masks";

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
      type: "left-parenthesis";
      position: number;
    }
  | {
      type: "right-parenthesis";
      position: number;
    }
  | {
      type: "empty-set";
      position: number;
    }
  | {
      type: "complement-postfix";
      position: number;
    }
  | {
      type: "end";
      position: number;
    };

export interface ParsedVennExpression {
  mask: number;
  regionIds: string[];
}

export class VennExpressionError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);

    this.name = "VennExpressionError";
    this.position = position;
  }
}

function isIdentifierCharacter(character: string) {
  return /[\p{L}\p{N}_]/u.test(character);
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < source.length) {
    const character = source[position];

    if (!character) {
      break;
    }

    if (/\s/u.test(character)) {
      position += 1;
      continue;
    }

    if (character === "(") {
      tokens.push({
        type: "left-parenthesis",
        position,
      });

      position += 1;
      continue;
    }

    if (character === ")") {
      tokens.push({
        type: "right-parenthesis",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "∅") {
      tokens.push({
        type: "empty-set",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "∪" || character === "|") {
      tokens.push({
        type: "operator",
        value: "union",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "∩" || character === "&") {
      tokens.push({
        type: "operator",
        value: "intersection",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "\\" || character === "-") {
      tokens.push({
        type: "operator",
        value: "difference",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "△" || character === "Δ" || character === "^") {
      tokens.push({
        type: "operator",
        value: "symmetric-difference",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "!") {
      tokens.push({
        type: "operator",
        value: "complement",
        position,
      });

      position += 1;
      continue;
    }

    if (character === "'" || character === "′" || character === "ᶜ") {
      tokens.push({
        type: "complement-postfix",
        position,
      });

      position += 1;
      continue;
    }

    if (isIdentifierCharacter(character)) {
      const start = position;

      while (position < source.length && isIdentifierCharacter(source[position] ?? "")) {
        position += 1;
      }

      tokens.push({
        type: "identifier",
        value: source.slice(start, position),
        position: start,
      });

      continue;
    }

    throw new VennExpressionError(`El símbolo “${character}” no es válido.`, position);
  }

  tokens.push({
    type: "end",
    position: source.length,
  });

  return tokens;
}

class ExpressionParser {
  private readonly diagram: VennDiagram;

  private readonly tokens: Token[];

  private readonly universeMask: number;

  private index = 0;

  constructor(diagram: VennDiagram, source: string) {
    this.diagram = diagram;
    this.tokens = tokenize(source);
    this.universeMask = getUniverseMask(diagram.sets.length);
  }

  parse() {
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
    return (
      this.tokens[this.index] ?? {
        type: "end",
        position: 0,
      }
    );
  }

  private advance() {
    const token = this.current();
    this.index += 1;

    return token;
  }

  private matchOperator(operator: Operator) {
    const token = this.current();

    if (token.type === "operator" && token.value === operator) {
      this.advance();
      return true;
    }

    return false;
  }

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
      const rightMask = this.parseIntersection();

      mask = mask & (this.universeMask ^ rightMask);
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
      const mask = this.parseComplement();

      return this.universeMask ^ mask;
    }

    let mask = this.parsePrimary();

    while (this.current().type === "complement-postfix") {
      this.advance();
      mask = this.universeMask ^ mask;
    }

    return mask;
  }

  private parsePrimary(): number {
    const token = this.current();

    if (token.type === "left-parenthesis") {
      this.advance();

      const mask = this.parseUnion();
      const closingToken = this.current();

      if (closingToken.type !== "right-parenthesis") {
        throw new VennExpressionError("Falta cerrar el paréntesis.", closingToken.position);
      }

      this.advance();

      return mask;
    }

    if (token.type === "empty-set") {
      this.advance();
      return 0;
    }

    if (token.type === "identifier") {
      this.advance();

      if (token.value.toUpperCase() === "U") {
        return this.universeMask;
      }

      const setIndex = this.diagram.sets.findIndex(
        (set) => set.name.toLocaleLowerCase() === token.value.toLocaleLowerCase(),
      );

      if (setIndex === -1) {
        throw new VennExpressionError(`No existe el conjunto “${token.value}”.`, token.position);
      }

      return getSetMask(setIndex, this.diagram.sets.length);
    }

    if (token.type === "end") {
      throw new VennExpressionError("La fórmula está incompleta.", token.position);
    }

    throw new VennExpressionError("Se esperaba un conjunto o un paréntesis.", token.position);
  }
}

export function getRegionIdsFromMask(diagram: VennDiagram, mask: number): string[] {
  return getVennRegions(diagram)
    .filter((_, regionIndex) => (mask & (1 << regionIndex)) !== 0)
    .map((region) => region.id);
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
