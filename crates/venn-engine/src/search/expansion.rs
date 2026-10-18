use std::collections::BTreeMap;

use crate::expression::Expression;
use crate::{BinaryOperator, RegionMask, VennEngine};

use super::SearchError;
use super::candidate::{Candidate, CandidateMetadata, consider_candidate};

const OPERATORS: [BinaryOperator; 4] = [
    BinaryOperator::Union,
    BinaryOperator::Intersection,
    BinaryOperator::Difference,
    BinaryOperator::SymmetricDifference,
];

fn binary_metadata(
    universe: RegionMask,
    operator: BinaryOperator,
    left: &Candidate,
    right: &Candidate,
    operation_count: usize,
) -> CandidateMetadata {
    let (mask, precedence) = match operator {
        BinaryOperator::Union => (left.mask | right.mask, 1),
        BinaryOperator::Intersection => (left.mask & right.mask, 4),
        BinaryOperator::Difference => (left.mask & (universe ^ right.mask), 3),
        BinaryOperator::SymmetricDifference => (left.mask ^ right.mask, 2),
    };

    let left_wrapped = left.expression.precedence() < precedence;
    let right_wrapped = right.expression.precedence() < precedence
        || (operator == BinaryOperator::Difference && right.expression.precedence() == precedence);

    let wrapping_length = 2 * usize::from(left_wrapped) + 2 * usize::from(right_wrapped);

    CandidateMetadata {
        mask,
        precedence,
        operations: operation_count,
        parentheses: left.parentheses + right.parentheses + wrapping_length,
        text_length: left.text_length + right.text_length + wrapping_length + 3,
    }
}

pub(super) fn expand_level(
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

        let wrapping_length = 2 * usize::from(operand.expression.precedence() < 5);

        let metadata = CandidateMetadata {
            mask,
            precedence: 5,
            operations: operation_count,
            parentheses: operand.parentheses + wrapping_length,
            text_length: operand.text_length + wrapping_length + 1,
        };

        consider_candidate(candidates, engine, names, metadata, || {
            Expression::complement(operand.expression.clone())
        })?;
    }

    for left_cost in 0..operation_count {
        let right_cost = operation_count - 1 - left_cost;

        for left in &levels[left_cost] {
            for right in &levels[right_cost] {
                for operator in OPERATORS {
                    let metadata =
                        binary_metadata(engine.universe(), operator, left, right, operation_count);

                    if target.is_some_and(|target| metadata.mask != target) {
                        continue;
                    }

                    consider_candidate(candidates, engine, names, metadata, || {
                        Expression::binary(
                            operator,
                            left.expression.clone(),
                            right.expression.clone(),
                        )
                    })?;
                }
            }
        }
    }

    Ok(())
}
