use crate::{BinaryOperator, EngineError, RegionMask, VennEngine};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Expression {
    Empty,
    Universe,
    Set(usize),
    Complement(Box<Expression>),
    Binary {
        operator: BinaryOperator,
        left: Box<Expression>,
        right: Box<Expression>,
    },
}

impl Expression {
    pub fn complement(expression: Self) -> Self {
        Self::Complement(Box::new(expression))
    }

    pub fn binary(operator: BinaryOperator, left: Self, right: Self) -> Self {
        Self::Binary {
            operator,
            left: Box::new(left),
            right: Box::new(right),
        }
    }

    pub fn operation_count(&self) -> usize {
        match self {
            Self::Empty | Self::Universe | Self::Set(_) => 0,
            Self::Complement(expression) => expression.operation_count() + 1,
            Self::Binary { left, right, .. } => {
                left.operation_count() + right.operation_count() + 1
            }
        }
    }

    pub fn evaluate(&self, engine: &VennEngine) -> Result<RegionMask, EngineError> {
        match self {
            Self::Empty => Ok(0),
            Self::Universe => Ok(engine.universe()),
            Self::Set(index) => engine.set_mask(*index),
            Self::Complement(expression) => engine.complement(expression.evaluate(engine)?),
            Self::Binary {
                operator,
                left,
                right,
            } => engine.apply(*operator, left.evaluate(engine)?, right.evaluate(engine)?),
        }
    }

    /// Names must follow the same order as the engine's sets.
    /// Returns None if a referenced set has no name.
    pub fn format(&self, names: &[String]) -> Option<String> {
        match self {
            Self::Empty => Some("∅".to_owned()),
            Self::Universe => Some("U".to_owned()),
            Self::Set(index) => names.get(*index).cloned(),
            Self::Complement(expression) => {
                let text = expression.format(names)?;

                if expression.precedence() < self.precedence() {
                    Some(format!("({text})ᶜ"))
                } else {
                    Some(format!("{text}ᶜ"))
                }
            }
            Self::Binary {
                operator,
                left,
                right,
            } => {
                let left_text = left.format(names)?;
                let right_text = right.format(names)?;

                let left_text = if left.precedence() < self.precedence() {
                    format!("({left_text})")
                } else {
                    left_text
                };

                let right_needs_parentheses = right.precedence() < self.precedence()
                    || (*operator == BinaryOperator::Difference
                        && right.precedence() == self.precedence());

                let right_text = if right_needs_parentheses {
                    format!("({right_text})")
                } else {
                    right_text
                };

                Some(format!("{left_text} {} {right_text}", symbol(*operator)))
            }
        }
    }

    pub(crate) fn precedence(&self) -> u8 {
        match self {
            Self::Empty | Self::Universe | Self::Set(_) => 6,
            Self::Complement(_) => 5,
            Self::Binary { operator, .. } => match operator {
                BinaryOperator::Intersection => 4,
                BinaryOperator::Difference => 3,
                BinaryOperator::SymmetricDifference => 2,
                BinaryOperator::Union => 1,
            },
        }
    }
}

fn symbol(operator: BinaryOperator) -> &'static str {
    match operator {
        BinaryOperator::Union => "∪",
        BinaryOperator::Intersection => "∩",
        BinaryOperator::Difference => "\\",
        BinaryOperator::SymmetricDifference => "△",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn names() -> Vec<String> {
        ["A", "B", "C", "D"]
            .into_iter()
            .map(str::to_owned)
            .collect()
    }

    fn binary(operator: BinaryOperator, left: Expression, right: Expression) -> Expression {
        Expression::binary(operator, left, right)
    }

    #[test]
    fn symmetric_difference_matches_expanded_expression() {
        let engine = VennEngine::new(2).unwrap();

        let short = binary(
            BinaryOperator::SymmetricDifference,
            Expression::Set(0),
            Expression::Set(1),
        );

        let expanded = binary(
            BinaryOperator::Union,
            binary(
                BinaryOperator::Intersection,
                Expression::Set(0),
                Expression::complement(Expression::Set(1)),
            ),
            binary(
                BinaryOperator::Intersection,
                Expression::complement(Expression::Set(0)),
                Expression::Set(1),
            ),
        );

        assert_eq!(
            short.evaluate(&engine).unwrap(),
            expanded.evaluate(&engine).unwrap()
        );
        assert_eq!(short.operation_count(), 1);
        assert_eq!(expanded.operation_count(), 5);
        assert_eq!(short.format(&names()).unwrap(), "A △ B");
    }

    #[test]
    fn complement_wraps_binary_expressions() {
        let expression = Expression::complement(binary(
            BinaryOperator::Union,
            Expression::Set(0),
            Expression::Set(1),
        ));

        assert_eq!(expression.format(&names()).unwrap(), "(A ∪ B)ᶜ");
        assert_eq!(expression.operation_count(), 2);
    }

    #[test]
    fn precedence_avoids_unnecessary_parentheses() {
        let expression = binary(
            BinaryOperator::Union,
            Expression::Set(0),
            binary(
                BinaryOperator::Intersection,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        assert_eq!(expression.format(&names()).unwrap(), "A ∪ B ∩ C");
    }

    #[test]
    fn lower_precedence_requires_parentheses() {
        let expression = binary(
            BinaryOperator::Intersection,
            Expression::Set(0),
            binary(
                BinaryOperator::Union,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        assert_eq!(expression.format(&names()).unwrap(), "A ∩ (B ∪ C)");
    }

    #[test]
    fn right_nested_difference_preserves_meaning() {
        let engine = VennEngine::new(3).unwrap();

        let right_nested = binary(
            BinaryOperator::Difference,
            Expression::Set(0),
            binary(
                BinaryOperator::Difference,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        let left_nested = binary(
            BinaryOperator::Difference,
            binary(
                BinaryOperator::Difference,
                Expression::Set(0),
                Expression::Set(1),
            ),
            Expression::Set(2),
        );

        assert_eq!(right_nested.format(&names()).unwrap(), "A \\ (B \\ C)");
        assert_eq!(left_nested.format(&names()).unwrap(), "A \\ B \\ C");
        assert_ne!(
            right_nested.evaluate(&engine).unwrap(),
            left_nested.evaluate(&engine).unwrap()
        );
    }

    #[test]
    fn constants_and_set_names_are_preserved() {
        assert_eq!(Expression::Empty.format(&names()).unwrap(), "∅");
        assert_eq!(Expression::Universe.format(&names()).unwrap(), "U");

        let custom_names = vec!["Conjunto α".to_owned()];

        assert_eq!(
            Expression::Set(0).format(&custom_names).unwrap(),
            "Conjunto α"
        );
        assert_eq!(Expression::Set(1).format(&custom_names), None);
    }

    #[test]
    fn invalid_set_reference_returns_an_error() {
        let engine = VennEngine::new(2).unwrap();

        assert!(matches!(
            Expression::Set(2).evaluate(&engine),
            Err(EngineError::InvalidSetIndex { .. })
        ));
    }
}
