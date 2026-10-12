import init, { WasmExpressionSession } from "../../../crates/venn-engine/pkg/venn_engine";

import type {
  ExpressionWorkerRequest,
  ExpressionWorkerResponse,
  MinimumExpressionResult,
} from "./expression-worker.types";

interface WorkerScope {
  onmessage: ((event: MessageEvent<ExpressionWorkerRequest>) => void) | null;
  postMessage: (message: ExpressionWorkerResponse) => void;
}

const scope = self as unknown as WorkerScope;

const initialized = init({
  module_or_path: new URL("../../../crates/venn-engine/pkg/venn_engine_bg.wasm", import.meta.url),
});

let session: WasmExpressionSession | null = null;
let sessionKey: string | null = null;

// Serialize initialization and requests so they share one Rust session.
let queue: Promise<void> = Promise.resolve();

function getSession(names: string[]): WasmExpressionSession {
  const key = JSON.stringify(names);

  if (session && sessionKey === key) {
    return session;
  }

  session?.free();
  session = null;
  sessionKey = null;

  const nextSession = new WasmExpressionSession(key);

  session = nextSession;
  sessionKey = key;

  return nextSession;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

scope.onmessage = (event) => {
  const request = event.data;

  queue = queue.then(async () => {
    try {
      await initialized;

      const currentSession = getSession(request.names);

      const json = currentSession.findMinimum(request.mask, request.maxOperations);

      const result = JSON.parse(json) as MinimumExpressionResult | null;

      scope.postMessage({
        id: request.id,
        success: true,
        result,
      });
    } catch (error) {
      scope.postMessage({
        id: request.id,
        success: false,
        error: getErrorMessage(error),
      });
    }
  });
};
