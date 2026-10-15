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

const engines: ExpressionEngine[] = [];

function createEngine() {
  const engine = new ExpressionEngine(["A", "B"]);
  engines.push(engine);

  const worker = WorkerStub.instances.at(-1);

  if (!worker) {
    throw new Error("El worker no se creó.");
  }

  return { engine, worker };
}

function result(text: string): MinimumExpressionResult {
  return {
    text,
    operationCount: 0,
    parenthesesCount: 0,
    minimumOperations: true,
  };
}

beforeEach(() => {
  WorkerStub.instances = [];
  vi.stubGlobal("Worker", WorkerStub);
});

afterEach(() => {
  for (const engine of engines) {
    engine.dispose();
  }

  engines.length = 0;
  vi.unstubAllGlobals();
});

describe("⚙️ Motor de expresiones", () => {
  it("asocia cada respuesta con su solicitud aunque lleguen en otro orden", async () => {
    const { engine, worker } = createEngine();

    const first = engine.findMinimum(10, 3);
    const second = engine.findMinimum(12, 3);

    worker.respond({
      id: 1,
      success: true,
      result: result("B"),
    });
    worker.respond({
      id: 0,
      success: true,
      result: result("A"),
    });

    await expect(first).resolves.toEqual(result("A"));
    await expect(second).resolves.toEqual(result("B"));
  });

  it("admite una respuesta sin solución dentro del límite", async () => {
    const { engine, worker } = createEngine();
    const pending = engine.findMinimum(1, 0);

    worker.respond({ id: 0, success: true, result: null });

    await expect(pending).resolves.toBeNull();
  });

  it("un error de búsqueda no cierra el motor", async () => {
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

    const next = engine.findMinimum(10, 3);
    worker.respond({ id: 1, success: true, result: result("A") });

    await expect(next).resolves.toEqual(result("A"));
  });

  it("rechaza selecciones y límites inválidos sin enviarlos al worker", async () => {
    const { engine, worker } = createEngine();

    for (const mask of [-1, 16, 1.5, Number.NaN]) {
      await expect(engine.findMinimum(mask, 3)).rejects.toThrow("selección");
    }

    for (const limit of [-1, 128, 1.5, Number.NaN]) {
      await expect(engine.findMinimum(1, limit)).rejects.toThrow("límite");
    }

    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("cancela las solicitudes pendientes y cierra una sola vez", async () => {
    const { engine, worker } = createEngine();

    const first = expect(engine.findMinimum(1, 3)).rejects.toThrow("cancelada");
    const second = expect(engine.findMinimum(2, 3)).rejects.toThrow("cancelada");

    engine.dispose();
    engine.dispose();

    await Promise.all([first, second]);

    expect(worker.terminate).toHaveBeenCalledTimes(1);

    await expect(engine.findMinimum(1, 3)).rejects.toThrow("cancelada");
  });

  it("conserva el error del worker para solicitudes pendientes y futuras", async () => {
    const { engine, worker } = createEngine();

    const first = expect(engine.findMinimum(1, 3)).rejects.toThrow("No se pudo cargar WASM.");
    const second = expect(engine.findMinimum(2, 3)).rejects.toThrow("No se pudo cargar WASM.");

    worker.dispatchEvent(
      new ErrorEvent("error", {
        message: "No se pudo cargar WASM.",
      }),
    );

    await Promise.all([first, second]);

    await expect(engine.findMinimum(1, 3)).rejects.toThrow("No se pudo cargar WASM.");

    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("cierra el motor cuando una respuesta no puede deserializarse", async () => {
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

    await expect(engine.findMinimum(1, 3)).rejects.toThrow("No se pudo enviar");

    const next = engine.findMinimum(10, 3);
    worker.respond({ id: 1, success: true, result: result("A") });

    await expect(next).resolves.toEqual(result("A"));
  });
});
