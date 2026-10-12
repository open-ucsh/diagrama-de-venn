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

        // Equal scores still require the stable text tie-break.
        if proposed_score > current_score {
            return Ok(());
        }
    }

    insert_candidate(candidates, Candidate::new(build(), engine, names)?);

    Ok(())
}

pub fn find_minimum_expression(
    engine: &VennEngine,
    names: &[String],
    target: RegionMask,
    max_operations: usize,
) -> Result<Option<SearchResult>, SearchError> {
    if names.len() != engine.set_count() {
        return Err(SearchError::InvalidNameCount {
            expected: engine.set_count(),
            received: names.len(),
        });
    }

    engine.regions_from_mask(target)?;

    let mut candidates = BTreeMap::new();

    let atoms = [Expression::Empty, Expression::Universe]
        .into_iter()
        .chain((0..engine.set_count()).map(Expression::Set));

    for atom in atoms {
        insert_candidate(&mut candidates, Candidate::new(atom, engine, names)?);
    }

    if let Some(result) = best_for_mask(&candidates, target) {
        return Ok(Some(result));
    }

    let mut levels: Vec<Vec<Candidate>> = vec![candidates.values().cloned().collect()];

    for operation_count in 1..=max_operations {
        for operand in &levels[operation_count - 1] {
            let wrapped = operand.expression.precedence() < 5;
            let wrapping_length = if wrapped { 2 } else { 0 };

            consider_candidate(
                &mut candidates,
                engine,
                names,
                engine.universe() ^ operand.mask,
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

                        let left_wrapped = left.expression.precedence() < precedence;

                        let right_wrapped = right.expression.precedence() < precedence
                            || (operator == BinaryOperator::Difference
                                && right.expression.precedence() == precedence);

                        let wrapping_length =
                            2 * usize::from(left_wrapped) + 2 * usize::from(right_wrapped);

                        let parentheses = left.parentheses + right.parentheses + wrapping_length;

                        // All supported binary symbols occupy one UTF-16 unit.
                        // Add two spaces and the operator.
                        let text_length =
                            left.text_length + right.text_length + wrapping_length + 3;

                        consider_candidate(
                            &mut candidates,
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

        if let Some(result) = best_for_mask(&candidates, target) {
            return Ok(Some(result));
        }

        let level = candidates
            .values()
            .filter(|candidate| candidate.operations == operation_count)
            .cloned()
            .collect::<Vec<_>>();

        if level.is_empty() {
            return Ok(None);
        }

        levels.push(level);
    }

    Ok(None)
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
