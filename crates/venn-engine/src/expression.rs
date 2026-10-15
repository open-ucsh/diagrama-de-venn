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

    /// Representa la expresión respetando la precedencia de los operadores.
    ///
    /// Los nombres deben seguir el orden de los conjuntos del motor.
    /// Devuelve `None` si falta el nombre de un conjunto referenciado.
    pub fn format(&self, names: &[String]) -> Option<String> {
        let precedence = self.precedence();

        match self {
            Self::Empty => Some("∅".to_owned()),
            Self::Universe => Some("U".to_owned()),
            Self::Set(index) => names.get(*index).cloned(),
            Self::Complement(expression) => {
                let operand =
                    expression.format_operand(names, expression.precedence() < precedence)?;

                Some(format!("{operand}ᶜ"))
            }
            Self::Binary {
                operator,
                left,
                right,
            } => {
                let left_text = left.format_operand(names, left.precedence() < precedence)?;

                // La diferencia no es asociativa: el operando derecho
                // necesita paréntesis también cuando tiene igual precedencia.
                let wrap_right = right.precedence() < precedence
                    || (*operator == BinaryOperator::Difference
                        && right.precedence() == precedence);

                let right_text = right.format_operand(names, wrap_right)?;

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

    fn format_operand(&self, names: &[String], wrapped: bool) -> Option<String> {
        let text = self.format(names)?;

        Some(if wrapped { format!("({text})") } else { text })
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
    use super::Expression;
    use crate::{BinaryOperator, EngineError, VennEngine};

    fn names() -> Vec<String> {
        ["A", "B", "C", "D"]
            .into_iter()
            .map(str::to_owned)
            .collect()
    }

    #[test]
    fn la_diferencia_simetrica_equivale_a_su_desarrollo() {
        let engine = VennEngine::new(2).unwrap();

        let short = Expression::binary(
            BinaryOperator::SymmetricDifference,
            Expression::Set(0),
            Expression::Set(1),
        );

        let expanded = Expression::binary(
            BinaryOperator::Union,
            Expression::binary(
                BinaryOperator::Intersection,
                Expression::Set(0),
                Expression::complement(Expression::Set(1)),
            ),
            Expression::binary(
                BinaryOperator::Intersection,
                Expression::complement(Expression::Set(0)),
                Expression::Set(1),
            ),
        );

        assert_eq!(
            short.evaluate(&engine).unwrap(),
            expanded.evaluate(&engine).unwrap(),
        );
        assert_eq!(short.operation_count(), 1);
        assert_eq!(expanded.operation_count(), 5);
        assert_eq!(short.format(&names()).unwrap(), "A △ B");
    }

    #[test]
    fn el_complemento_envuelve_las_expresiones_binarias() {
        let expression = Expression::complement(Expression::binary(
            BinaryOperator::Union,
            Expression::Set(0),
            Expression::Set(1),
        ));

        assert_eq!(expression.format(&names()).unwrap(), "(A ∪ B)ᶜ");
        assert_eq!(expression.operation_count(), 2);
    }

    #[test]
    fn evita_parentesis_cuando_la_precedencia_es_suficiente() {
        let expression = Expression::binary(
            BinaryOperator::Union,
            Expression::Set(0),
            Expression::binary(
                BinaryOperator::Intersection,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        assert_eq!(expression.format(&names()).unwrap(), "A ∪ B ∩ C");
    }

    #[test]
    fn agrega_parentesis_cuando_el_operando_tiene_menor_precedencia() {
        let expression = Expression::binary(
            BinaryOperator::Intersection,
            Expression::Set(0),
            Expression::binary(
                BinaryOperator::Union,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        assert_eq!(expression.format(&names()).unwrap(), "A ∩ (B ∪ C)");
    }

    #[test]
    fn los_parentesis_de_la_diferencia_conservan_su_significado() {
        let engine = VennEngine::new(3).unwrap();

        let right_nested = Expression::binary(
            BinaryOperator::Difference,
            Expression::Set(0),
            Expression::binary(
                BinaryOperator::Difference,
                Expression::Set(1),
                Expression::Set(2),
            ),
        );

        let left_nested = Expression::binary(
            BinaryOperator::Difference,
            Expression::binary(
                BinaryOperator::Difference,
                Expression::Set(0),
                Expression::Set(1),
            ),
            Expression::Set(2),
        );

        assert_eq!(right_nested.format(&names()).unwrap(), "A \\ (B \\ C)",);
        assert_eq!(left_nested.format(&names()).unwrap(), "A \\ B \\ C",);
        assert_ne!(
            right_nested.evaluate(&engine).unwrap(),
            left_nested.evaluate(&engine).unwrap(),
        );
    }

    #[test]
    fn conserva_las_constantes_y_los_nombres_personalizados() {
        assert_eq!(Expression::Empty.format(&names()).unwrap(), "∅");
        assert_eq!(Expression::Universe.format(&names()).unwrap(), "U");

        let custom_names = vec!["Conjunto α".to_owned()];

        assert_eq!(
            Expression::Set(0).format(&custom_names).unwrap(),
            "Conjunto α",
        );
        assert_eq!(Expression::Set(1).format(&custom_names), None);
    }

    #[test]
    fn propaga_la_ausencia_de_un_nombre_en_expresiones_compuestas() {
        let expression = Expression::complement(Expression::binary(
            BinaryOperator::Union,
            Expression::Set(0),
            Expression::Set(1),
        ));

        assert_eq!(expression.format(&["A".to_owned()]), None);
    }

    #[test]
    fn rechaza_referencias_a_conjuntos_inexistentes() {
        let engine = VennEngine::new(2).unwrap();

        assert!(matches!(
            Expression::Set(2).evaluate(&engine),
            Err(EngineError::InvalidSetIndex {
                index: 2,
                set_count: 2,
            }),
        ));
    }
}
