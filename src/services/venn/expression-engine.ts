import type {
  ExpressionWorkerRequest,
  ExpressionWorkerResponse,
  MinimumExpressionResult,
} from "./expression-worker.types";

export type { MinimumExpressionResult } from "./expression-worker.types";

interface PendingRequest {
  resolve: (result: MinimumExpressionResult | null) => void;
  reject: (error: Error) => void;
}

export class ExpressionEngine {
  private readonly worker: Worker;
  private readonly names: string[];
  private readonly pending = new Map<number, PendingRequest>();

  private nextRequestId = 0;
  private disposed = false;

  constructor(names: string[]) {
    if (names.length < 1 || names.length > 4) {
      throw new Error("El motor admite entre 1 y 4 conjuntos.");
    }

    this.names = [...names];

    this.worker = new Worker(new URL("./expression.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleError);
    this.worker.addEventListener("messageerror", this.handleMessageError);
  }

  findMinimum(mask: number, maxOperations: number): Promise<MinimumExpressionResult | null> {
    if (this.disposed) {
      return Promise.reject(new Error("El motor está cerrado."));
    }

    const regionCount = 2 ** this.names.length;
    const universeMask = 2 ** regionCount - 1;

    if (!Number.isInteger(mask) || mask < 0 || mask > universeMask) {
      return Promise.reject(new Error("La selección de regiones es inválida."));
    }

    if (!Number.isInteger(maxOperations) || maxOperations < 0 || maxOperations > 127) {
      return Promise.reject(new Error("El límite de operaciones debe estar entre 0 y 127."));
    }

    const id = this.nextRequestId++;

    const request: ExpressionWorkerRequest = {
      id,
      names: this.names,
      mask,
      maxOperations,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      try {
        this.worker.postMessage(request);
      } catch (error) {
        this.pending.delete(id);

        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.removeEventListener("error", this.handleError);
    this.worker.removeEventListener("messageerror", this.handleMessageError);

    this.worker.terminate();

    for (const request of this.pending.values()) {
      request.reject(new Error("La búsqueda fue cancelada."));
    }

    this.pending.clear();
  }

  private readonly handleMessage = (event: MessageEvent<ExpressionWorkerResponse>): void => {
    const response = event.data;
    const request = this.pending.get(response.id);

    if (!request) {
      return;
    }

    this.pending.delete(response.id);

    if (response.success) {
      request.resolve(response.result);
    } else {
      request.reject(new Error(response.error));
    }
  };

  private readonly handleError = (event: ErrorEvent): void => {
    const message = event.message || "No se pudo ejecutar el motor Rust.";

    this.fail(new Error(message));
  };

  private readonly handleMessageError = (): void => {
    this.fail(new Error("No se pudo leer la respuesta del motor Rust."));
  };

  private fail(error: Error): void {
    for (const request of this.pending.values()) {
      request.reject(error);
    }

    this.pending.clear();
    this.dispose();
  }
}
