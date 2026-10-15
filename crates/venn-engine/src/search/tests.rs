use crate::{BinaryOperator, EngineError, VennEngine};

use super::{SearchError, SearchSession, find_minimum_expression};

fn names(set_count: usize) -> Vec<String> {
    ["A", "B", "C", "D"][..set_count]
        .iter()
        .map(|name| (*name).to_owned())
        .collect()
}

#[test]
fn reutiliza_los_niveles_y_los_resultados_de_la_sesion() {
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

    // El resultado guardado también debe respetar un límite menor.
    assert!(session.find(target, 1).unwrap().is_none());

    let union = engine.set_mask(0).unwrap() | engine.set_mask(1).unwrap();
    let result = session.find(union, 1).unwrap().unwrap();

    assert_eq!(result.operation_count, 1);
    assert_eq!(result.expression.evaluate(&engine).unwrap(), union);
    assert_eq!(session.completed_operation_count(), completed);
}

#[test]
fn la_sesion_compartida_coincide_con_busquedas_independientes() {
    let engine = VennEngine::new(2).unwrap();
    let names = names(2);
    let mut session = SearchSession::new(engine, names.clone()).unwrap();

    for target in (0..=engine.universe()).rev() {
        let shared = session.find(target, 3).unwrap().unwrap();
        let fresh = find_minimum_expression(&engine, &names, target, 3)
            .unwrap()
            .unwrap();

        assert_eq!(shared.text, fresh.text, "Selección: {target:#06X}");
        assert_eq!(shared.operation_count, fresh.operation_count);
        assert_eq!(shared.parentheses_count, fresh.parentheses_count);
        assert_eq!(shared.expression.evaluate(&engine).unwrap(), target);
    }
}

#[test]
fn filtrar_el_ultimo_nivel_conserva_el_resultado() {
    let engine = VennEngine::new(2).unwrap();
    let names = names(2);

    for target in 0..=engine.universe() {
        for limit in 0..=3 {
            let filtered = find_minimum_expression(&engine, &names, target, limit).unwrap();

            let complete = find_minimum_expression(&engine, &names, target, limit + 1).unwrap();
            let within_limit = complete.filter(|result| result.operation_count <= limit);

            assert_eq!(
                filtered.as_ref().map(|result| &result.text),
                within_limit.as_ref().map(|result| &result.text),
                "Resultados distintos para la máscara {target:#06X} y el límite {limit}",
            );
        }
    }
}

#[test]
fn las_constantes_y_los_conjuntos_no_necesitan_operaciones() {
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
fn encuentra_la_diferencia_simetrica_con_una_operacion() {
    let engine = VennEngine::new(4).unwrap();
    let names = names(4);
    let target = engine.set_mask(0).unwrap() ^ engine.set_mask(1).unwrap();

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
fn encuentra_el_complemento_sin_parentesis() {
    let engine = VennEngine::new(4).unwrap();
    let names = names(4);
    let target = engine.complement(engine.set_mask(0).unwrap()).unwrap();

    let result = find_minimum_expression(&engine, &names, target, 1)
        .unwrap()
        .unwrap();

    assert_eq!(result.text, "Aᶜ");
    assert_eq!(result.operation_count, 1);
    assert_eq!(result.parentheses_count, 0);
    assert_eq!(result.expression.evaluate(&engine).unwrap(), target);
}

#[test]
fn encuentra_la_diferencia_con_una_operacion() {
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
    assert_eq!(result.expression.evaluate(&engine).unwrap(), target);
}

#[test]
fn la_interseccion_de_tres_conjuntos_necesita_dos_operaciones() {
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
fn resuelve_todas_las_selecciones_de_dos_conjuntos_con_el_minimo_de_operaciones() {
    let engine = VennEngine::new(2).unwrap();
    let names = names(2);

    for target in 0..=engine.universe() {
        let result = find_minimum_expression(&engine, &names, target, 3)
            .unwrap()
            .expect("Toda selección de dos conjuntos debe poder representarse");

        assert_eq!(result.expression.evaluate(&engine).unwrap(), target);

        if result.operation_count == 0 {
            continue;
        }

        let smaller =
            find_minimum_expression(&engine, &names, target, result.operation_count - 1).unwrap();

        assert!(
            smaller.is_none(),
            "La selección {target:#06X} admite una solución con menos operaciones",
        );
    }
}

#[test]
fn rechaza_una_cantidad_incorrecta_de_nombres() {
    let engine = VennEngine::new(2).unwrap();

    assert!(matches!(
        find_minimum_expression(&engine, &[], 0, 1),
        Err(SearchError::InvalidNameCount {
            expected: 2,
            received: 0,
        })
    ));
}

#[test]
fn rechaza_una_seleccion_fuera_del_universo() {
    let engine = VennEngine::new(2).unwrap();

    assert!(matches!(
        find_minimum_expression(&engine, &names(2), 16, 1),
        Err(SearchError::Engine(EngineError::MaskOutsideUniverse(16)))
    ));
}

#[test]
fn produce_resultados_deterministas() {
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
    assert_eq!(first.operation_count, second.operation_count);
    assert_eq!(first.parentheses_count, second.parentheses_count);
}
