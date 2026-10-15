use crate::BinaryOperator;

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

            let complete_within_limit = complete.filter(|result| result.operation_count <= limit);

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
