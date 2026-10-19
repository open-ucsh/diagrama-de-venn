use std::collections::BTreeMap;

use crate::expression::Expression;
use crate::{RegionMask, VennEngine};

use super::{SearchError, SearchResult};

#[derive(Debug, Clone, Copy)]
pub(super) struct CandidateMetadata {
    pub(super) mask: RegionMask,
    pub(super) precedence: u8,
    pub(super) operations: usize,
    pub(super) parentheses: usize,
    pub(super) text_length: usize,
}

impl CandidateMetadata {
    fn key(self) -> (RegionMask, u8) {
        (self.mask, self.precedence)
    }

    fn score(self) -> (usize, usize, usize) {
        (self.operations, self.parentheses, self.text_length)
    }
}

#[derive(Debug, Clone)]
pub(super) struct Candidate {
    pub(super) expression: Expression,
    pub(super) mask: RegionMask,
    pub(super) text: String,
    pub(super) operations: usize,
    pub(super) parentheses: usize,
    pub(super) text_length: usize,
}

impl Candidate {
    pub(super) fn new(
        expression: Expression,
        engine: &VennEngine,
        names: &[String],
    ) -> Result<Self, SearchError> {
        let mask = expression.evaluate(engine)?;
        let text = expression
            .format(names)
            .expect("Los nombres deben cubrir todas las referencias a conjuntos");

        let operations = expression.operation_count();
        let parentheses = count_parentheses(&text);

        // Usa UTF-16 para coincidir con string.length de JavaScript.
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

    fn metadata(&self) -> CandidateMetadata {
        CandidateMetadata {
            mask: self.mask,
            precedence: self.expression.precedence(),
            operations: self.operations,
            parentheses: self.parentheses,
            text_length: self.text_length,
        }
    }

    fn rank(&self) -> (usize, usize, usize, &str) {
        (
            self.operations,
            self.parentheses,
            self.text_length,
            self.text.as_str(),
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

fn count_parentheses(text: &str) -> usize {
    text.chars()
        .filter(|character| matches!(character, '(' | ')'))
        .count()
}

pub(super) fn insert_candidate(
    candidates: &mut BTreeMap<(RegionMask, u8), Candidate>,
    candidate: Candidate,
) {
    let key = candidate.metadata().key();

    if let Some(current) = candidates.get(&key)
        && candidate.rank() >= current.rank()
    {
        return;
    }

    candidates.insert(key, candidate);
}

pub(super) fn best_for_mask(
    candidates: &BTreeMap<(RegionMask, u8), Candidate>,
    target: RegionMask,
) -> Option<SearchResult> {
    candidates
        .values()
        .filter(|candidate| candidate.mask == target)
        .min_by(|left, right| left.rank().cmp(&right.rank()))
        .cloned()
        .map(Candidate::into_result)
}

pub(super) fn consider_candidate(
    candidates: &mut BTreeMap<(RegionMask, u8), Candidate>,
    engine: &VennEngine,
    names: &[String],
    metadata: CandidateMetadata,
    build: impl FnOnce() -> Expression,
) -> Result<(), SearchError> {
    if let Some(current) = candidates.get(&metadata.key())
        && metadata.score() > current.metadata().score()
    {
        return Ok(());
    }

    // Los empates necesitan el texto para aplicar el último desempate.
    let expression = build();
    let text = expression
        .format(names)
        .expect("Los nombres deben cubrir todas las referencias a conjuntos");

    // Detecta inconsistencias sin repetir estos recorridos en producción.
    debug_assert_eq!(expression.evaluate(engine)?, metadata.mask);
    debug_assert_eq!(expression.precedence(), metadata.precedence);
    debug_assert_eq!(expression.operation_count(), metadata.operations);
    debug_assert_eq!(count_parentheses(&text), metadata.parentheses);
    debug_assert_eq!(text.encode_utf16().count(), metadata.text_length);

    insert_candidate(
        candidates,
        Candidate {
            expression,
            mask: metadata.mask,
            text,
            operations: metadata.operations,
            parentheses: metadata.parentheses,
            text_length: metadata.text_length,
        },
    );

    Ok(())
}
