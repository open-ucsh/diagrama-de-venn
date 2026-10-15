mod candidate;
mod expansion;

use std::collections::BTreeMap;

use crate::expression::Expression;
use crate::{EngineError, RegionMask, VennEngine};

use self::candidate::{Candidate, best_for_mask, insert_candidate};
use self::expansion::expand_level;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SearchError {
    Engine(EngineError),
    InvalidNameCount { expected: usize, received: usize },
}

impl From<EngineError> for SearchError {
    fn from(error: EngineError) -> Self {
        Self::Engine(error)
    }
}

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub expression: Expression,
    pub text: String,
    pub operation_count: usize,
    pub parentheses_count: usize,
}

pub struct SearchSession {
    engine: VennEngine,
    names: Vec<String>,
    candidates: BTreeMap<(RegionMask, u8), Candidate>,
    levels: Vec<Vec<Candidate>>,
    results: BTreeMap<RegionMask, SearchResult>,
    exhausted: bool,
}

impl SearchSession {
    pub fn new(engine: VennEngine, names: Vec<String>) -> Result<Self, SearchError> {
        if names.len() != engine.set_count() {
            return Err(SearchError::InvalidNameCount {
                expected: engine.set_count(),
                received: names.len(),
            });
        }

        let mut candidates = BTreeMap::new();

        let atoms = [Expression::Empty, Expression::Universe]
            .into_iter()
            .chain((0..engine.set_count()).map(Expression::Set));

        for atom in atoms {
            insert_candidate(&mut candidates, Candidate::new(atom, &engine, &names)?);
        }

        let levels = vec![candidates.values().cloned().collect()];

        Ok(Self {
            engine,
            names,
            candidates,
            levels,
            results: BTreeMap::new(),
            exhausted: false,
        })
    }

    pub fn completed_operation_count(&self) -> usize {
        self.levels.len() - 1
    }

    /// Busca una expresión con el mínimo número de operaciones.
    ///
    /// Devuelve `None` si no encuentra una solución dentro del límite.
    /// Los nombres deben ser aceptados por el parser de la aplicación.
    pub fn find(
        &mut self,
        target: RegionMask,
        max_operations: usize,
    ) -> Result<Option<SearchResult>, SearchError> {
        self.engine.regions_from_mask(target)?;

        if let Some(result) = self.results.get(&target) {
            return Ok((result.operation_count <= max_operations).then(|| result.clone()));
        }

        if let Some(result) = best_for_mask(&self.candidates, target) {
            if result.operation_count > max_operations {
                return Ok(None);
            }

            self.results.insert(target, result.clone());

            return Ok(Some(result));
        }

        while !self.exhausted && self.completed_operation_count() < max_operations {
            let operation_count = self.levels.len();

            // Busca primero la selección solicitada sin incorporar un nivel
            // parcial a los niveles reutilizables de la sesión.
            let mut target_candidates = BTreeMap::new();

            expand_level(
                &self.engine,
                &self.names,
                &self.levels,
                &mut target_candidates,
                operation_count,
                Some(target),
            )?;

            if let Some(result) = best_for_mask(&target_candidates, target) {
                self.results.insert(target, result.clone());

                return Ok(Some(result));
            }

            if operation_count == max_operations {
                return Ok(None);
            }

            // Completa el nivel para reutilizar sus subexpresiones
            // al buscar soluciones con más operaciones.
            expand_level(
                &self.engine,
                &self.names,
                &self.levels,
                &mut self.candidates,
                operation_count,
                None,
            )?;

            let level = self
                .candidates
                .values()
                .filter(|candidate| candidate.operations == operation_count)
                .cloned()
                .collect::<Vec<_>>();

            if level.is_empty() {
                self.exhausted = true;
                return Ok(None);
            }

            self.levels.push(level);
        }

        Ok(None)
    }
}

pub fn find_minimum_expression(
    engine: &VennEngine,
    names: &[String],
    target: RegionMask,
    max_operations: usize,
) -> Result<Option<SearchResult>, SearchError> {
    SearchSession::new(*engine, names.to_vec())?.find(target, max_operations)
}

#[cfg(test)]
mod tests;
