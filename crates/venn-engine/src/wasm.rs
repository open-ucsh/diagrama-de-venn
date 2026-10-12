use wasm_bindgen::prelude::*;

use crate::VennEngine;
use crate::search::SearchSession;

#[wasm_bindgen]
pub struct WasmExpressionSession {
    session: SearchSession,
}

#[wasm_bindgen]
impl WasmExpressionSession {
    #[wasm_bindgen(constructor)]
    pub fn new(names_json: &str) -> Result<WasmExpressionSession, JsValue> {
        let names: Vec<String> = serde_json::from_str(names_json)
            .map_err(|error| JsValue::from_str(&format!("Invalid set names: {error}")))?;

        let engine =
            VennEngine::new(names.len()).map_err(|error| JsValue::from_str(&error.to_string()))?;

        let session = SearchSession::new(engine, names)
            .map_err(|error| JsValue::from_str(&format!("Cannot create session: {error:?}")))?;

        Ok(Self { session })
    }

    /// Returns a JSON result, or JSON null when the limit is insufficient.
    #[wasm_bindgen(js_name = findMinimum)]
    pub fn find_minimum(&mut self, target: u32, max_operations: u32) -> Result<String, JsValue> {
        let target =
            u16::try_from(target).map_err(|_| JsValue::from_str("Target must fit in 16 bits"))?;

        // A canonical expression for four sets requires at most
        // 16 terms × 7 operations per term + 15 unions = 127 operations.
        // This is a representability bound, not a recommended search depth.
        if max_operations > 127 {
            return Err(JsValue::from_str("Operation limit must not exceed 127"));
        }

        let result = self
            .session
            .find(target, max_operations as usize)
            .map_err(|error| JsValue::from_str(&format!("Search failed: {error:?}")))?;

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
