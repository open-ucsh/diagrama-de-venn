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

let initialization: Promise<void> | null = null;
let session: WasmExpressionSession | null = null;
let sessionKey: string | null = null;

// Serializa las solicitudes porque comparten una sesión mutable de Rust.
let queue: Promise<void> = Promise.resolve();

function initialize(): Promise<void> {
  initialization ??= init({
    module_or_path: new URL("../../../crates/venn-engine/pkg/venn_engine_bg.wasm", import.meta.url),
  }).then(() => undefined);

  return initialization;
}

function getSession(names: string[]): WasmExpressionSession {
  const key = JSON.stringify(names);

  if (session && sessionKey === key) {
    return session;
  }

  session?.free();
  session = null;
  sessionKey = null;

  session = new WasmExpressionSession(key);
  sessionKey = key;

  return session;
}

async function processRequest(request: ExpressionWorkerRequest): Promise<ExpressionWorkerResponse> {
  try {
    await initialize();

    const currentSession = getSession(request.names);
    const json = currentSession.findMinimum(request.mask, request.maxOperations);

    const result = JSON.parse(json) as MinimumExpressionResult | null;

    return {
      id: request.id,
      success: true,
      result,
    };
  } catch (error) {
    return {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

scope.onmessage = (event) => {
  const request = event.data;

  queue = queue.then(async () => {
    const response = await processRequest(request);
    scope.postMessage(response);
  });
};
