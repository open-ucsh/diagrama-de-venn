import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpressionEngine, type MinimumExpressionResult } from "@/services/venn/expression-engine";
import type {
  ExpressionWorkerRequest,
  ExpressionWorkerResponse,
} from "@/services/venn/expression-worker.types";

class WorkerStub extends EventTarget {
  static instances: WorkerStub[] = [];

  readonly postMessage = vi.fn<(request: ExpressionWorkerRequest) => void>();

  readonly terminate = vi.fn();

  constructor() {
    super();
    WorkerStub.instances.push(this);
  }

  respond(response: ExpressionWorkerResponse): void {
    this.dispatchEvent(new MessageEvent("message", { data: response }));
  }
}

function createResult(text: string): MinimumExpressionResult {
  return {
    text,
    operationCount: 0,
    parenthesesCount: 0,
    minimumOperations: true,
  };
}

describe("Motor de expresiones", () => {
  const engines: ExpressionEngine[] = [];

  function createEngine() {
    const engine = new ExpressionEngine(["A", "B"]);
    engines.push(engine);

    const worker = WorkerStub.instances.at(-1);

    if (!worker) {
      throw new Error("No se creó el worker.");
    }

    return { engine, worker };
  }

  beforeEach(() => {
    WorkerStub.instances = [];
    vi.stubGlobal("Worker", WorkerStub);
  });

  afterEach(() => {
    try {
      for (const engine of engines) {
        engine.dispose();
      }
    } finally {
      engines.length = 0;
      WorkerStub.instances = [];
      vi.unstubAllGlobals();
    }
  });

  it("asocia cada respuesta con su solicitud aunque lleguen en otro orden", async () => {
    const { engine, worker } = createEngine();
    const firstResult = createResult("A");
    const secondResult = createResult("B");

    const first = engine.findMinimum(10, 3);
    const second = engine.findMinimum(12, 3);

    worker.respond({
      id: 1,
      success: true,
      result: secondResult,
    });
    worker.respond({
      id: 0,
      success: true,
      result: firstResult,
    });

    await expect(first).resolves.toEqual(firstResult);
    await expect(second).resolves.toEqual(secondResult);
  });

  it("admite una respuesta sin solución dentro del límite solicitado", async () => {
    const { engine, worker } = createEngine();

    const pending = engine.findMinimum(1, 0);

    worker.respond({
      id: 0,
      success: true,
      result: null,
    });

    await expect(pending).resolves.toBeNull();
  });

  it("permite nuevas búsquedas después de un error de búsqueda", async () => {
    const { engine, worker } = createEngine();
    const pending = engine.findMinimum(1, 3);
    const rejected = expect(pending).rejects.toThrow("Búsqueda fallida.");

    worker.respond({
      id: 0,
      success: false,
      error: "Búsqueda fallida.",
    });

    await rejected;

    expect(worker.terminate).not.toHaveBeenCalled();

    const expected = createResult("A");
    const next = engine.findMinimum(10, 3);

    worker.respond({
      id: 1,
      success: true,
      result: expected,
    });

    await expect(next).resolves.toEqual(expected);
  });

  it.each([-1, 16, 1.5, Number.NaN])(
    "rechaza la selección inválida %s sin enviarla al worker",
    async (mask) => {
      const { engine, worker } = createEngine();

      await expect(engine.findMinimum(mask, 3)).rejects.toThrow("selección");

      expect(worker.postMessage).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 128, 1.5, Number.NaN])(
    "rechaza el límite inválido %s sin enviarlo al worker",
    async (limit) => {
      const { engine, worker } = createEngine();

      await expect(engine.findMinimum(1, limit)).rejects.toThrow("límite");

      expect(worker.postMessage).not.toHaveBeenCalled();
    },
  );

  it("cancela las solicitudes pendientes y cierra el worker una sola vez", async () => {
    const { engine, worker } = createEngine();

    const first = expect(engine.findMinimum(1, 3)).rejects.toThrow("cancelada");
    const second = expect(engine.findMinimum(2, 3)).rejects.toThrow("cancelada");

    engine.dispose();
    engine.dispose();

    await Promise.all([first, second]);

    expect(worker.terminate).toHaveBeenCalledTimes(1);

    await expect(engine.findMinimum(1, 3)).rejects.toThrow("cancelada");

    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });

  it("conserva el error del worker para las solicitudes pendientes y futuras", async () => {
    const { engine, worker } = createEngine();
    const message = "No se pudo cargar WASM.";

    const first = expect(engine.findMinimum(1, 3)).rejects.toThrow(message);
    const second = expect(engine.findMinimum(2, 3)).rejects.toThrow(message);

    worker.dispatchEvent(
      new ErrorEvent("error", {
        message,
      }),
    );

    await Promise.all([first, second]);

    await expect(engine.findMinimum(1, 3)).rejects.toThrow(message);

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });

  it("cierra el motor cuando no se puede deserializar una respuesta", async () => {
    const { engine, worker } = createEngine();

    const rejected = expect(engine.findMinimum(1, 3)).rejects.toThrow("No se pudo leer");

    worker.dispatchEvent(new MessageEvent("messageerror"));

    await rejected;

    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("permite continuar después de un fallo al enviar una solicitud", async () => {
    const { engine, worker } = createEngine();

    worker.postMessage.mockImplementationOnce(() => {
      throw new Error("No se pudo enviar la solicitud.");
    });

    await expect(engine.findMinimum(1, 3)).rejects.toThrow("No se pudo enviar la solicitud.");

    expect(worker.terminate).not.toHaveBeenCalled();

    const expected = createResult("A");
    const next = engine.findMinimum(10, 3);

    worker.respond({
      id: 1,
      success: true,
      result: expected,
    });

    await expect(next).resolves.toEqual(expected);
  });
});
