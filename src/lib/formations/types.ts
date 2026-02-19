/**
 * Formation type definitions.
 * Slot positions use EN abbreviations (GK, CB, RB, ST, etc.).
 */

export interface FormationSlot {
  id: number;        // Maps to fieldSlotIndex on matchPlayers
  x: number;         // 0-100 normalized horizontal position
  y: number;         // 0-100 normalized vertical position (0 = top/attack, 100 = bottom/goal)
  position: string;  // EN abbreviation: "GK", "CB", "RB", "CM", "ST", etc.
}

export interface Formation {
  name: string;              // Display name, e.g. "1-3-3-1 (Gebalanceerd)"
  slots: FormationSlot[];    // Player positions
  links: [number, number][]; // Lines between slot IDs for visualization
}
