pub mod expression;
pub mod search;

#[cfg(target_arch = "wasm32")]
mod wasm;

use std::fmt;

/// Cada bit representa una región: cuatro conjuntos generan dieciséis regiones.
pub type RegionMask = u16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineError {
    InvalidSetCount(usize),
    InvalidSetIndex { index: usize, set_count: usize },
    InvalidRegion { region: usize, region_count: usize },
    MaskOutsideUniverse(RegionMask),
}

impl fmt::Display for EngineError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidSetCount(count) => write!(
                formatter,
                "Se admiten entre 1 y 4 conjuntos; se recibieron {count}"
            ),
            Self::InvalidSetIndex { index, set_count } => write!(
                formatter,
                "El índice {index} no corresponde a ninguno de los {set_count} conjuntos"
            ),
            Self::InvalidRegion {
                region,
                region_count,
            } => write!(
                formatter,
                "La región {region} no corresponde a ninguna de las {region_count} regiones"
            ),
            Self::MaskOutsideUniverse(mask) => write!(
                formatter,
                "La máscara {mask} contiene regiones fuera del universo"
            ),
        }
    }
}

impl std::error::Error for EngineError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryOperator {
    Union,
    Intersection,
    Difference,
    SymmetricDifference,
}

#[derive(Debug, Clone, Copy)]
pub struct VennEngine {
    set_count: usize,
    region_count: usize,
    universe: RegionMask,
}

impl VennEngine {
    pub fn new(set_count: usize) -> Result<Self, EngineError> {
        if !(1..=4).contains(&set_count) {
            return Err(EngineError::InvalidSetCount(set_count));
        }

        let region_count = 1_usize << set_count;

        // El desplazamiento necesita 32 bits cuando existen dieciséis regiones.
        let universe = ((1_u32 << region_count) - 1) as RegionMask;

        Ok(Self {
            set_count,
            region_count,
            universe,
        })
    }

    pub fn set_count(&self) -> usize {
        self.set_count
    }

    pub fn region_count(&self) -> usize {
        self.region_count
    }

    pub fn universe(&self) -> RegionMask {
        self.universe
    }

    pub fn set_mask(&self, index: usize) -> Result<RegionMask, EngineError> {
        if index >= self.set_count {
            return Err(EngineError::InvalidSetIndex {
                index,
                set_count: self.set_count,
            });
        }

        let mut mask = 0;

        for region in 0..self.region_count {
            if region & (1_usize << index) != 0 {
                mask |= 1_u16 << region;
            }
        }

        Ok(mask)
    }

    pub fn mask_from_regions(&self, regions: &[usize]) -> Result<RegionMask, EngineError> {
        let mut mask = 0;

        for &region in regions {
            if region >= self.region_count {
                return Err(EngineError::InvalidRegion {
                    region,
                    region_count: self.region_count,
                });
            }

            mask |= 1_u16 << region;
        }

        Ok(mask)
    }

    pub fn regions_from_mask(&self, mask: RegionMask) -> Result<Vec<usize>, EngineError> {
        self.validate_mask(mask)?;

        Ok((0..self.region_count)
            .filter(|&region| mask & (1_u16 << region) != 0)
            .collect())
    }

    pub fn complement(&self, mask: RegionMask) -> Result<RegionMask, EngineError> {
        self.validate_mask(mask)?;

        Ok(self.universe ^ mask)
    }

    pub fn apply(
        &self,
        operator: BinaryOperator,
        left: RegionMask,
        right: RegionMask,
    ) -> Result<RegionMask, EngineError> {
        self.validate_mask(left)?;
        self.validate_mask(right)?;

        Ok(match operator {
            BinaryOperator::Union => left | right,
            BinaryOperator::Intersection => left & right,
            BinaryOperator::Difference => left & (self.universe ^ right),
            BinaryOperator::SymmetricDifference => left ^ right,
        })
    }

    fn validate_mask(&self, mask: RegionMask) -> Result<(), EngineError> {
        if mask & !self.universe != 0 {
            return Err(EngineError::MaskOutsideUniverse(mask));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{BinaryOperator, EngineError, VennEngine};

    #[test]
    fn admite_entre_uno_y_cuatro_conjuntos() {
        for set_count in 1..=4 {
            let engine = VennEngine::new(set_count).unwrap();

            assert_eq!(engine.set_count(), set_count);
            assert_eq!(engine.region_count(), 1_usize << set_count);
        }

        assert_eq!(
            VennEngine::new(0).unwrap_err(),
            EngineError::InvalidSetCount(0),
        );
        assert_eq!(
            VennEngine::new(5).unwrap_err(),
            EngineError::InvalidSetCount(5),
        );
    }

    #[test]
    fn cuatro_conjuntos_utilizan_los_dieciséis_bits() {
        let engine = VennEngine::new(4).unwrap();

        assert_eq!(engine.universe(), u16::MAX);
        assert_eq!(engine.set_mask(0).unwrap(), 0xAAAA);
        assert_eq!(engine.set_mask(1).unwrap(), 0xCCCC);
        assert_eq!(engine.set_mask(2).unwrap(), 0xF0F0);
        assert_eq!(engine.set_mask(3).unwrap(), 0xFF00);
    }

    #[test]
    fn el_orden_de_los_conjuntos_coincide_con_typescript() {
        let engine = VennEngine::new(2).unwrap();
        let a = engine.set_mask(0).unwrap();
        let b = engine.set_mask(1).unwrap();

        assert_eq!(engine.regions_from_mask(a).unwrap(), vec![1, 3]);
        assert_eq!(engine.regions_from_mask(b).unwrap(), vec![2, 3]);
    }

    #[test]
    fn las_operaciones_respetan_la_pertenencia_a_las_regiones() {
        let engine = VennEngine::new(2).unwrap();
        let a = engine.set_mask(0).unwrap();
        let b = engine.set_mask(1).unwrap();

        let cases = [
            (BinaryOperator::Union, vec![1, 2, 3]),
            (BinaryOperator::Intersection, vec![3]),
            (BinaryOperator::Difference, vec![1]),
            (BinaryOperator::SymmetricDifference, vec![1, 2]),
        ];

        for (operator, expected_regions) in cases {
            let result = engine.apply(operator, a, b).unwrap();

            assert_eq!(engine.regions_from_mask(result).unwrap(), expected_regions,);
        }

        let complement = engine.complement(a).unwrap();

        assert_eq!(engine.regions_from_mask(complement).unwrap(), vec![0, 2],);
    }

    #[test]
    fn la_conversion_de_regiones_conserva_todas_las_mascaras_de_cuatro_conjuntos() {
        let engine = VennEngine::new(4).unwrap();

        for mask in 0_u16..=u16::MAX {
            let regions = engine.regions_from_mask(mask).unwrap();

            assert_eq!(engine.mask_from_regions(&regions).unwrap(), mask);
        }
    }

    #[test]
    fn el_complemento_cumple_las_identidades_booleanas() {
        for set_count in 1..=4 {
            let engine = VennEngine::new(set_count).unwrap();

            for mask in 0..=engine.universe() {
                let complement = engine.complement(mask).unwrap();

                assert_eq!(engine.complement(complement).unwrap(), mask);
                assert_eq!(
                    engine
                        .apply(BinaryOperator::Union, mask, complement)
                        .unwrap(),
                    engine.universe(),
                );
                assert_eq!(
                    engine
                        .apply(BinaryOperator::Intersection, mask, complement)
                        .unwrap(),
                    0,
                );
            }
        }
    }

    #[test]
    fn rechaza_entradas_fuera_del_universo() {
        let engine = VennEngine::new(2).unwrap();

        assert!(matches!(
            engine.set_mask(2),
            Err(EngineError::InvalidSetIndex { .. }),
        ));
        assert!(matches!(
            engine.mask_from_regions(&[4]),
            Err(EngineError::InvalidRegion { .. }),
        ));
        assert_eq!(
            engine.complement(16),
            Err(EngineError::MaskOutsideUniverse(16)),
        );
        assert_eq!(
            engine.apply(BinaryOperator::Union, 0, 16),
            Err(EngineError::MaskOutsideUniverse(16)),
        );
        assert_eq!(
            engine.regions_from_mask(16),
            Err(EngineError::MaskOutsideUniverse(16)),
        );
    }

    #[test]
    fn repetir_regiones_no_modifica_la_seleccion() {
        let engine = VennEngine::new(2).unwrap();

        assert_eq!(
            engine.mask_from_regions(&[1, 1, 3]).unwrap(),
            engine.mask_from_regions(&[1, 3]).unwrap(),
        );
    }
}
