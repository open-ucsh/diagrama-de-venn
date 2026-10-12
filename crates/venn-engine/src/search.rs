use std::collections::BTreeMap;

use crate::expression::Expression;
use crate::{BinaryOperator, EngineError, RegionMask, VennEngine};

const OPERATORS: [BinaryOperator; 4] = [
    BinaryOperator::Union,
    BinaryOperator::Intersection,
    BinaryOperator::Difference,
    BinaryOperator::SymmetricDifference,
];

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

#[derive(Debug, Clone)]
struct Candidate {
    expression: Expression,
    mask: RegionMask,
    text: String,
    operations: usize,
    parentheses: usize,
    text_length: usize,
}

impl Candidate {
    fn new(
        expression: Expression,
        engine: &VennEngine,
        names: &[String],
    ) -> Result<Self, SearchError> {
        let mask = expression.evaluate(engine)?;
        let text = expression
            .format(names)
            .expect("Validated names must cover every set");

        let operations = expression.operation_count();
        let parentheses = text
            .chars()
            .filter(|character| matches!(character, '(' | ')'))
            .count();

        // Match JavaScript string.length for the length criterion.
        let text_length = text.encode_utf16().count();

        Ok(Self {
            expression,
            mask,
            text,
            operations,
            parentheses,
            text_length,
        })
    }

    fn key(&self) -> (RegionMask, u8) {
        (self.mask, self.expression.precedence())
    }

    fn is_better_than(&self, other: &Self) -> bool {
        (
            self.operations,
            self.parentheses,
            self.text_length,
            &self.text,
        ) < (
            other.operations,
            other.parentheses,
            other.text_length,
            &other.text,
        )
    }

    fn into_result(self) -> SearchResult {
        SearchResult {
            expression: self.expression,
            text: self.text,
            operation_count: self.operations,
            parentheses_count: self.parentheses,
        }
    }
}

fn insert_candidate(candidates: &mut BTreeMap<(RegionMask, u8), Candidate>, candidate: Candidate) {
    let key = candidate.key();

    if let Some(current) = candidates.get(&key)
        && !candidate.is_better_than(current)
    {
        return;
    }

    candidates.insert(key, candidate);
}

fn best_for_mask(
    candidates: &BTreeMap<(RegionMask, u8), Candidate>,
    target: RegionMask,
) -> Option<SearchResult> {
    let mut best: Option<&Candidate> = None;

    for candidate in candidates.values() {
        if candidate.mask != target {
            continue;
        }

        if best.is_none_or(|current| candidate.is_better_than(current)) {
            best = Some(candidate);
        }
    }

    best.cloned().map(Candidate::into_result)
}

/// Searches all operation levels from zero through `max_operations`.
///
/// A returned result has the minimum operation count in the supported grammar.
/// Parentheses and UTF-16 text length break ties, followed by stable text order.
///
/// None means no result was found within the requested operation limit.
/// Set names should be valid atomic names accepted by the application's parser.
#[allow(clippy::too_many_arguments)]
fn consider_candidate(
    candidates: &mut BTreeMap<(RegionMask, u8), Candidate>,
    engine: &VennEngine,
    names: &[String],
    mask: RegionMask,
    precedence: u8,
    operations: usize,
    parentheses: usize,
    text_length: usize,
    build: impl FnOnce() -> Expression,
) -> Result<(), SearchError> {
    if let Some(current) = candidates.get(&(mask, precedence)) {
        let proposed_score = (operations, parentheses, text_length);
        let current_score = (current.operations, current.parentheses, current.text_length);

        if proposed_score > current_score {
            return Ok(());
        }
    }

    let expression = build();

    let text = expression
        .format(names)
        .expect("Validated names must cover every set");

    // Verify the cached metadata during tests and debug builds.
    // Release builds avoid these repeated traversals.
    debug_assert_eq!(expression.evaluate(engine)?, mask);
    debug_assert_eq!(expression.precedence(), precedence);
    debug_assert_eq!(expression.operation_count(), operations);

    debug_assert_eq!(
        text.chars()
            .filter(|character| matches!(character, '(' | ')'))
            .count(),
        parentheses,
    );

    debug_assert_eq!(text.encode_utf16().count(), text_length);

    insert_candidate(
        candidates,
        Candidate {
            expression,
            mask,
            text,
            operations,
            parentheses,
            text_length,
        },
    );

    Ok(())
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

            // Search only the requested selection at the next operation level.
            // These candidates are kept separate from complete reusable levels.
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

            // No solution at this level. Build the full level so the next
            // operation level can reuse its subexpressions.
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

fn expand_level(
    engine: &VennEngine,
    names: &[String],
    levels: &[Vec<Candidate>],
    candidates: &mut BTreeMap<(RegionMask, u8), Candidate>,
    operation_count: usize,
    target: Option<RegionMask>,
) -> Result<(), SearchError> {
    for operand in &levels[operation_count - 1] {
        let mask = engine.universe() ^ operand.mask;

        if target.is_some_and(|target| mask != target) {
            continue;
        }

        let wrapped = operand.expression.precedence() < 5;
        let wrapping_length = if wrapped { 2 } else { 0 };

        consider_candidate(
            candidates,
            engine,
            names,
            mask,
            5,
            operation_count,
            operand.parentheses + wrapping_length,
            operand.text_length + wrapping_length + 1,
            || Expression::complement(operand.expression.clone()),
        )?;
    }

    for left_cost in 0..operation_count {
        let right_cost = operation_count - 1 - left_cost;

        for left in &levels[left_cost] {
            for right in &levels[right_cost] {
                for operator in OPERATORS {
                    let (mask, precedence) = match operator {
                        BinaryOperator::Union => (left.mask | right.mask, 1),
                        BinaryOperator::Intersection => (left.mask & right.mask, 4),
                        BinaryOperator::Difference => {
                            (left.mask & (engine.universe() ^ right.mask), 3)
                        }
                        BinaryOperator::SymmetricDifference => (left.mask ^ right.mask, 2),
                    };

                    if target.is_some_and(|target| mask != target) {
                        continue;
                    }

                    let left_wrapped = left.expression.precedence() < precedence;

                    let right_wrapped = right.expression.precedence() < precedence
                        || (operator == BinaryOperator::Difference
                            && right.expression.precedence() == precedence);

                    let wrapping_length =
                        2 * usize::from(left_wrapped) + 2 * usize::from(right_wrapped);

                    let parentheses = left.parentheses + right.parentheses + wrapping_length;

                    let text_length = left.text_length + right.text_length + wrapping_length + 3;

                    consider_candidate(
                        candidates,
                        engine,
                        names,
                        mask,
                        precedence,
                        operation_count,
                        parentheses,
                        text_length,
                        || {
                            Expression::binary(
                                operator,
                                left.expression.clone(),
                                right.expression.clone(),
                            )
                        },
                    )?;
                }
            }
        }
    }

    Ok(())
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
mod tests {
    use super::*;

    fn names(set_count: usize) -> Vec<String> {
        ["A", "B", "C", "D"][..set_count]
            .iter()
            .map(|name| (*name).to_owned())
            .collect()
    }

    #[test]
    fn session_reuses_levels_and_results() {
        let engine = VennEngine::new(3).unwrap();
        let mut session = SearchSession::new(engine, names(3)).unwrap();

        let target =
            engine.set_mask(0).unwrap() & engine.set_mask(1).unwrap() & engine.set_mask(2).unwrap();

        let first = session.find(target, 2).unwrap().unwrap();
        let completed = session.completed_operation_count();
        let second = session.find(target, 2).unwrap().unwrap();

        assert_eq!(first.text, second.text);
        assert_eq!(session.completed_operation_count(), completed);
        assert_eq!(completed, 1);

        // A cached result must still respect a smaller requested limit.
        assert!(session.find(target, 1).unwrap().is_none());

        let union = engine.set_mask(0).unwrap() | engine.set_mask(1).unwrap();
        let result = session.find(union, 1).unwrap().unwrap();

        assert_eq!(result.operation_count, 1);
        assert_eq!(result.expression.evaluate(&engine).unwrap(), union);
        assert_eq!(session.completed_operation_count(), completed);
    }

    #[test]
    fn shared_session_matches_fresh_searches() {
        let engine = VennEngine::new(2).unwrap();
        let names = names(2);
        let mut session = SearchSession::new(engine, names.clone()).unwrap();

        for target in (0..=engine.universe()).rev() {
            let shared = session.find(target, 3).unwrap().unwrap();
            let fresh = find_minimum_expression(&engine, &names, target, 3)
                .unwrap()
                .unwrap();

            assert_eq!(shared.text, fresh.text);
            assert_eq!(shared.operation_count, fresh.operation_count);
            assert_eq!(shared.expression.evaluate(&engine).unwrap(), target);
        }
    }

    #[test]
    fn target_only_level_preserves_results() {
        let engine = VennEngine::new(2).unwrap();
        let names = names(2);

        for target in 0..=engine.universe() {
            for limit in 0..=3 {
                let filtered = find_minimum_expression(&engine, &names, target, limit).unwrap();

                // The extra level makes `limit` a complete intermediate level.
                let complete = find_minimum_expression(&engine, &names, target, limit + 1).unwrap();

                let complete_within_limit =
                    complete.filter(|result| result.operation_count <= limit);

                assert_eq!(
                    filtered.as_ref().map(|result| &result.text),
                    complete_within_limit.as_ref().map(|result| &result.text),
                    "Different result for mask {target}, limit {limit}",
                );
            }
        }
    }

    #[test]
    fn constants_and_sets_need_no_operations() {
        let engine = VennEngine::new(4).unwrap();
        let names = names(4);

        let cases = [
            (0, "∅"),
            (engine.universe(), "U"),
            (engine.set_mask(0).unwrap(), "A"),
            (engine.set_mask(3).unwrap(), "D"),
        ];

        for (mask, expected) in cases {
            let result = find_minimum_expression(&engine, &names, mask, 0)
                .unwrap()
                .unwrap();

            assert_eq!(result.text, expected);
            assert_eq!(result.operation_count, 0);
            assert_eq!(result.expression.evaluate(&engine).unwrap(), mask);
        }
    }

    #[test]
    fn finds_symmetric_difference_in_one_operation() {
        let engine = VennEngine::new(4).unwrap();
        let names = names(4);
        let a = engine.set_mask(0).unwrap();
        let b = engine.set_mask(1).unwrap();
        let target = a ^ b;

        assert!(
            find_minimum_expression(&engine, &names, target, 0)
                .unwrap()
                .is_none()
        );

        let result = find_minimum_expression(&engine, &names, target, 1)
            .unwrap()
            .unwrap();

        assert_eq!(result.text, "A △ B");
        assert_eq!(result.operation_count, 1);
        assert_eq!(result.expression.evaluate(&engine).unwrap(), target);
    }

    #[test]
    fn finds_complement_without_parentheses() {
        let engine = VennEngine::new(4).unwrap();
        let names = names(4);
        let target = engine.complement(engine.set_mask(0).unwrap()).unwrap();

        let result = find_minimum_expression(&engine, &names, target, 1)
            .unwrap()
            .unwrap();

        assert_eq!(result.text, "Aᶜ");
        assert_eq!(result.operation_count, 1);
        assert_eq!(result.parentheses_count, 0);
    }

    #[test]
    fn finds_difference_in_one_operation() {
        let engine = VennEngine::new(4).unwrap();
        let names = names(4);

        let target = engine
            .apply(
                BinaryOperator::Difference,
                engine.set_mask(0).unwrap(),
                engine.set_mask(1).unwrap(),
            )
            .unwrap();

        let result = find_minimum_expression(&engine, &names, target, 1)
            .unwrap()
            .unwrap();

        assert_eq!(result.text, "A \\ B");
        assert_eq!(result.operation_count, 1);
    }

    #[test]
    fn three_set_intersection_requires_two_operations() {
        let engine = VennEngine::new(3).unwrap();
        let names = names(3);

        let target =
            engine.set_mask(0).unwrap() & engine.set_mask(1).unwrap() & engine.set_mask(2).unwrap();

        assert!(
            find_minimum_expression(&engine, &names, target, 1)
                .unwrap()
                .is_none()
        );

        let result = find_minimum_expression(&engine, &names, target, 2)
            .unwrap()
            .unwrap();

        assert_eq!(result.text, "A ∩ B ∩ C");
        assert_eq!(result.operation_count, 2);
        assert_eq!(result.parentheses_count, 0);
    }

    #[test]
    fn solves_every_two_set_selection() {
        let engine = VennEngine::new(2).unwrap();
        let names = names(2);

        for target in 0..=engine.universe() {
            let result = find_minimum_expression(&engine, &names, target, 3)
                .unwrap()
                .expect("Every two-set selection must be representable");

            assert_eq!(result.expression.evaluate(&engine).unwrap(), target);

            if result.operation_count > 0 {
                assert!(
                    find_minimum_expression(&engine, &names, target, result.operation_count - 1,)
                        .unwrap()
                        .is_none()
                );
            }
        }
    }

    #[test]
    fn validates_names_and_target() {
        let engine = VennEngine::new(2).unwrap();

        assert!(matches!(
            find_minimum_expression(&engine, &[], 0, 1),
            Err(SearchError::InvalidNameCount { .. })
        ));

        assert!(matches!(
            find_minimum_expression(&engine, &names(2), 16, 1),
            Err(SearchError::Engine(EngineError::MaskOutsideUniverse(16)))
        ));
    }

    #[test]
    fn results_are_deterministic() {
        let engine = VennEngine::new(3).unwrap();
        let names = names(3);
        let target = engine.set_mask(0).unwrap() ^ engine.set_mask(1).unwrap();

        let first = find_minimum_expression(&engine, &names, target, 2)
            .unwrap()
            .unwrap();

        let second = find_minimum_expression(&engine, &names, target, 2)
            .unwrap()
            .unwrap();

        assert_eq!(first.text, second.text);
        assert_eq!(first.expression, second.expression);
    }
}
