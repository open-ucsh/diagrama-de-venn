import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import { getExpressionSearchKey } from "@/domain/venn/expressions/expression-search-key";
import type { VennDiagram } from "@/domain/venn/models";
import { getErrorMessage } from "@/lib/errors";
import { ExpressionEngine } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";
import { useVennExpression, type VennExpressionState } from "@/state/venn-expression";

const SEARCH_DELAY_MS = 200;
const HISTORY_DELAY_MS = 700;

interface CompletedSearch extends VennExpressionState {
  attempt: number;
}

function createIdleSearch(key: string): VennExpressionState {
  return {
    key,
    status: "idle",
    text: "",
    error: null,
  };
}

interface MinimumExpressionOptions {
  diagram: VennDiagram;
  selectedRegionIds: string[];
  isEditing: boolean;
  isEditingRef: RefObject<boolean>;
  attempt: number;
  saveFormulaToHistory: (formula: string) => void;
}

export function useMinimumExpression({
  diagram,
  selectedRegionIds,
  isEditing,
  isEditingRef,
  attempt,
  saveFormulaToHistory,
}: MinimumExpressionOptions) {
  const engineRef = useRef<ExpressionEngine | null>(null);
  const engineErrorRef = useRef<Error | null>(null);
  const requestVersionRef = useRef(0);
  const [completedSearch, setCompletedSearch] = useState<CompletedSearch | null>(null);

  const namesKey = JSON.stringify(diagram.sets.map((set) => set.name));
  const selectedMask = getSelectedMask(diagram, selectedRegionIds);
  const hasSelection = selectedRegionIds.length > 0;
  const searchKey = getExpressionSearchKey(diagram, selectedMask, hasSelection);

  const diagramRef = useRef(diagram);
  const latestSearchKeyRef = useRef(searchKey);

  const search = useMemo<VennExpressionState>(() => {
    if (isEditing || !hasSelection) {
      return createIdleSearch(searchKey);
    }

    if (completedSearch?.key === searchKey && completedSearch.attempt === attempt) {
      return {
        key: completedSearch.key,
        status: completedSearch.status,
        text: completedSearch.text,
        error: completedSearch.error,
      };
    }

    return {
      key: searchKey,
      status: "searching",
      text: "",
      error: null,
    };
  }, [isEditing, hasSelection, searchKey, completedSearch, attempt]);

  useLayoutEffect(() => {
    diagramRef.current = diagram;
    latestSearchKeyRef.current = searchKey;
  }, [diagram, searchKey]);

  useLayoutEffect(() => {
    useVennExpression.setState(search);
  }, [search]);

  useEffect(() => {
    engineErrorRef.current = null;

    const names = diagramRef.current.sets.map((set) => set.name);

    if (names.length === 0) {
      return;
    }

    let engine: ExpressionEngine;

    try {
      engine = new ExpressionEngine(names);
      engineRef.current = engine;
    } catch (error) {
      engineErrorRef.current =
        error instanceof Error ? error : new Error("No fue posible iniciar el motor de fórmulas.");

      return;
    }

    return () => {
      engine.dispose();

      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [namesKey]);

  useEffect(() => {
    const version = ++requestVersionRef.current;
    let cancelled = false;

    if (isEditing || !hasSelection) {
      return;
    }

    const searchDiagram = diagramRef.current;

    function isCurrent(): boolean {
      return (
        !cancelled &&
        requestVersionRef.current === version &&
        !isEditingRef.current &&
        latestSearchKeyRef.current === searchKey
      );
    }

    async function calculate(): Promise<void> {
      if (!isCurrent()) {
        return;
      }

      if (engineErrorRef.current) {
        throw engineErrorRef.current;
      }

      const engine = engineRef.current;

      if (!engine) {
        throw new Error("El motor de fórmulas no está disponible.");
      }

      const result = await findMinimumExpression({
        engine,
        diagram: searchDiagram,
        selectedMask,
        isCurrent,
      });

      if (!result || !isCurrent()) {
        return;
      }

      setCompletedSearch({
        key: searchKey,
        attempt,
        status: "ready",
        text: result.text,
        error: null,
      });
    }

    const timeoutId = window.setTimeout(() => {
      void calculate().catch((error: unknown) => {
        if (!isCurrent()) {
          return;
        }

        setCompletedSearch({
          key: searchKey,
          attempt,
          status: "error",
          text: "",
          error: getErrorMessage(error, "No fue posible calcular la fórmula."),
        });
      });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchKey, selectedMask, hasSelection, isEditing, namesKey, attempt, isEditingRef]);

  useEffect(() => {
    if (search.status !== "ready" || !search.text) {
      return;
    }

    const version = requestVersionRef.current;

    const timeoutId = window.setTimeout(() => {
      if (
        !isEditingRef.current &&
        requestVersionRef.current === version &&
        latestSearchKeyRef.current === search.key
      ) {
        saveFormulaToHistory(search.text);
      }
    }, HISTORY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, saveFormulaToHistory, isEditingRef]);

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;
      useVennExpression.setState(createIdleSearch(""));
    };
  }, []);

  function invalidateSearch(): void {
    requestVersionRef.current += 1;
    useVennExpression.setState(createIdleSearch(latestSearchKeyRef.current));
  }

  return { search, invalidateSearch };
}
