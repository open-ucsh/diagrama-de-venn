use std::time::Instant;

use venn_engine::VennEngine;
use venn_engine::search::SearchSession;

fn main() {
    let max_operations = std::env::args()
        .nth(1)
        .map(|value| {
            value
                .parse::<usize>()
                .expect("The operation limit must be a non-negative integer")
        })
        .unwrap_or(3);

    let engine = VennEngine::new(4).unwrap();

    let names = ["A", "B", "C", "D"]
        .into_iter()
        .map(str::to_owned)
        .collect::<Vec<_>>();

    let mut session = SearchSession::new(engine, names).unwrap();

    let a = engine.set_mask(0).unwrap();
    let b = engine.set_mask(1).unwrap();
    let c = engine.set_mask(2).unwrap();
    let d = engine.set_mask(3).unwrap();

    let cases = [
        ("Empty selection", 0),
        ("Universe", engine.universe()),
        ("One set", a),
        ("Complement", engine.complement(a).unwrap()),
        ("Two-set difference", a & !b),
        ("Two-set symmetric difference", a ^ b),
        ("Four-set intersection", a & b & c & d),
        ("Four-set union", a | b | c | d),
        ("Four-set parity", a ^ b ^ c ^ d),
        ("Mixed selection", 0x6997),
        ("Mixed selection, cached", 0x6997),
        ("Parity after mixed selection", a ^ b ^ c ^ d),
    ];

    println!("Four sets · maximum {max_operations} operations");
    println!("Shared search session");
    println!();

    for (label, target) in cases {
        let started = Instant::now();
        let result = session.find(target, max_operations).unwrap();
        let elapsed = started.elapsed();

        match result {
            Some(result) => {
                assert_eq!(result.expression.evaluate(&engine).unwrap(), target);

                println!(
                    "{label}: {:.3} ms | {} operations | {}",
                    elapsed.as_secs_f64() * 1_000.0,
                    result.operation_count,
                    result.text,
                );
            }
            None => {
                println!(
                    "{label}: {:.3} ms | no solution within the operation limit",
                    elapsed.as_secs_f64() * 1_000.0,
                );
            }
        }
    }

    println!();
    println!(
        "Complete reusable levels: 0 through {}",
        session.completed_operation_count()
    );
}
