export interface Point {
  x: number;
  y: number;
}

export interface VennSet {
  id: string;
  name: string;
  position: Point;
  radius: number;
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
}
