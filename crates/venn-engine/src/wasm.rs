use wasm_bindgen::prelude::*;

use crate::VennEngine;
use crate::search::SearchSession;

const MAX_OPERATION_LIMIT: u32 = 127;

#[wasm_bindgen]
pub struct WasmExpressionSession {
    session: SearchSession,
}

#[wasm_bindgen]
impl WasmExpressionSession {
    #[wasm_bindgen(constructor)]
    pub fn new(names_json: &str) -> Result<Self, JsValue> {
        let names: Vec<String> = serde_json::from_str(names_json).map_err(|error| {
            JsValue::from_str(&format!(
                "No se pudieron interpretar los nombres de los conjuntos: {error}"
            ))
        })?;

        let engine =
            VennEngine::new(names.len()).map_err(|error| JsValue::from_str(&error.to_string()))?;

        let session = SearchSession::new(engine, names)
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        Ok(Self { session })
    }

    /// Devuelve el resultado como JSON, o `null` si el límite es insuficiente.
    #[wasm_bindgen(js_name = findMinimum)]
    pub fn find_minimum(&mut self, target: u32, max_operations: u32) -> Result<String, JsValue> {
        let target = u16::try_from(target)
            .map_err(|_| JsValue::from_str("La selección debe poder representarse con 16 bits."))?;

        // Una expresión canónica de cuatro conjuntos admite hasta 127 operaciones:
        // 16 términos de 7 operaciones, unidos mediante 15 uniones.
        // Es un límite de representación, no de tiempo de ejecución.
        if max_operations > MAX_OPERATION_LIMIT {
            return Err(JsValue::from_str(&format!(
                "El límite no puede superar {MAX_OPERATION_LIMIT} operaciones."
            )));
        }

        let result = self
            .session
            .find(target, max_operations as usize)
            .map_err(|error| {
                JsValue::from_str(&format!("No se pudo completar la búsqueda: {error}"))
            })?;

        let value = match result {
            Some(result) => serde_json::json!({
                "text": result.text,
                "operationCount": result.operation_count,
                "parenthesesCount": result.parentheses_count,
                "minimumOperations": true,
            }),
            None => serde_json::Value::Null,
        };

        Ok(value.to_string())
    }

    #[wasm_bindgen(js_name = completedOperationCount)]
    pub fn completed_operation_count(&self) -> usize {
        self.session.completed_operation_count()
    }
}
