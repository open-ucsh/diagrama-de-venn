mod candidate;
mod expansion;

use std::collections::BTreeMap;
use std::fmt;

use crate::expression::Expression;
use crate::{EngineError, RegionMask, VennEngine};

use self::candidate::{Candidate, best_for_mask, insert_candidate};
use self::expansion::expand_level;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SearchError {
    Engine(EngineError),
    InvalidNameCount { expected: usize, received: usize },
}

impl fmt::Display for SearchError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Engine(error) => write!(formatter, "{error}"),
            Self::InvalidNameCount { expected, received } => write!(
                formatter,
                "Se esperaban {expected} nombres de conjuntos y se recibieron {received}"
            ),
        }
    }
}

impl std::error::Error for SearchError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Engine(error) => Some(error),
            Self::InvalidNameCount { .. } => None,
        }
    }
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

/// Conserva niveles completos y resultados para reutilizarlos entre búsquedas.
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

    /// Mayor número de operaciones cuyo nivel se ha construido completamente.
    pub fn completed_operation_count(&self) -> usize {
        self.levels.len() - 1
    }

    /// Busca una expresión con el mínimo número de operaciones.
    ///
    /// Desempata por paréntesis, longitud UTF-16 y orden del texto.
    /// Devuelve `None` si no encuentra una solución dentro del límite.
    ///
    /// Los nombres deben ser nombres atómicos aceptados por el parser
    /// de la aplicación.
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

            if let Some(result) = self.search_target_level(target, operation_count)? {
                self.results.insert(target, result.clone());
                return Ok(Some(result));
            }

            if operation_count == max_operations {
                return Ok(None);
            }

            self.complete_next_level(operation_count)?;
        }

        Ok(None)
    }

    fn search_target_level(
        &self,
        target: RegionMask,
        operation_count: usize,
    ) -> Result<Option<SearchResult>, SearchError> {
        // Un nivel filtrado por objetivo no sirve como nivel completo reutilizable.
        let mut candidates = BTreeMap::new();

        expand_level(
            &self.engine,
            &self.names,
            &self.levels,
            &mut candidates,
            operation_count,
            Some(target),
        )?;

        Ok(best_for_mask(&candidates, target))
    }

    fn complete_next_level(&mut self, operation_count: usize) -> Result<(), SearchError> {
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
            return Ok(());
        }

        self.levels.push(level);

        Ok(())
    }
}

/// Realiza una búsqueda independiente, sin reutilizar sesiones anteriores.
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
