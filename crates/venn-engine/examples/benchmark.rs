use std::error::Error;
use std::io;
use std::process::ExitCode;
use std::time::Instant;

use venn_engine::search::SearchSession;
use venn_engine::{RegionMask, VennEngine};

const DEFAULT_OPERATION_LIMIT: usize = 3;
const MAX_OPERATION_LIMIT: usize = 127;

fn operation_limit() -> Result<usize, io::Error> {
    let mut arguments = std::env::args().skip(1);

    let limit = match arguments.next() {
        Some(value) => value.parse::<usize>().map_err(|_| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "El límite debe ser un número entero no negativo.",
            )
        })?,
        None => DEFAULT_OPERATION_LIMIT,
    };

    if arguments.next().is_some() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Se admite un único argumento: el límite de operaciones.",
        ));
    }

    if limit > MAX_OPERATION_LIMIT {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("El límite no puede superar {MAX_OPERATION_LIMIT} operaciones."),
        ));
    }

    Ok(limit)
}

fn measure(
    session: &mut SearchSession,
    engine: &VennEngine,
    label: &str,
    target: RegionMask,
    max_operations: usize,
) -> Result<(), Box<dyn Error>> {
    let started = Instant::now();
    let result = session.find(target, max_operations)?;
    let elapsed_ms = started.elapsed().as_secs_f64() * 1_000.0;

    let Some(result) = result else {
        println!(
            "{label}: {elapsed_ms:.3} ms | sin solución con hasta {max_operations} operaciones"
        );
        return Ok(());
    };

    // La comprobación queda fuera del tiempo medido.
    let evaluated = result.expression.evaluate(engine)?;

    if evaluated != target {
        return Err(io::Error::other(format!(
            "Resultado incorrecto en «{label}»: se esperaba {target:#06X} y se obtuvo {evaluated:#06X}."
        ))
        .into());
    }

    println!(
        "{label}: {elapsed_ms:.3} ms | {} operaciones | {}",
        result.operation_count, result.text,
    );

    Ok(())
}

fn run() -> Result<(), Box<dyn Error>> {
    let max_operations = operation_limit()?;
    let engine = VennEngine::new(4)?;

    let names = ["A", "B", "C", "D"]
        .into_iter()
        .map(str::to_owned)
        .collect();

    let mut session = SearchSession::new(engine, names)?;

    let a = engine.set_mask(0)?;
    let b = engine.set_mask(1)?;
    let c = engine.set_mask(2)?;
    let d = engine.set_mask(3)?;

    let cases = [
        ("Selección vacía", 0),
        ("Universo", engine.universe()),
        ("Un conjunto", a),
        ("Complemento", engine.complement(a)?),
        ("Diferencia de dos conjuntos", a & !b),
        ("Diferencia simétrica de dos conjuntos", a ^ b),
        ("Intersección de cuatro conjuntos", a & b & c & d),
        ("Unión de cuatro conjuntos", a | b | c | d),
        ("Paridad de cuatro conjuntos", a ^ b ^ c ^ d),
        ("Selección mixta", 0x6997),
        ("Selección mixta, repetición", 0x6997),
        ("Paridad después de la selección mixta", a ^ b ^ c ^ d),
    ];

    println!("🦀 Motor de expresiones · cuatro conjuntos");
    println!("Límite: {max_operations} operaciones");
    println!("Sesión compartida: cada caso puede reutilizar trabajo de los anteriores.");
    println!();

    for (label, target) in cases {
        measure(&mut session, &engine, label, target, max_operations)?;
    }

    println!();
    println!(
        "Niveles completos reutilizables: del 0 al {}",
        session.completed_operation_count(),
    );
    println!("Medición orientativa: una ejecución por caso, sin promedio estadístico.");

    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("Error al ejecutar el benchmark: {error}");
            ExitCode::FAILURE
        }
    }
}
