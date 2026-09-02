export interface Point {
  x: number;
  y: number;
}

export type VennSetShape = "circle" | "ellipse";

export interface VennSet {
  id: string;
  name: string;
  position: Point;
  radius: number;
  shape?: VennSetShape;
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
}

export interface VennElement {
  id: string;
  label: string;
  setIds: string[];
}

export interface VennDiagramMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VennDiagram {
  id: string;
  metadata: VennDiagramMetadata;
  sets: VennSet[];
  elements: VennElement[];
}
