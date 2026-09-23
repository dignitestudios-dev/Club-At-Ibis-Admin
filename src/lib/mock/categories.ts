import { daysAgo } from "./date-helpers";

/**
 * Fixed project information that every category form starts with, per the
 * product flow. These are not editable in the form builder; the Super Admin
 * configures the additional fields and document uploads on top of them.
 */
export const baseProjectFields: CategoryField[] = [
  { id: "propertyAddress", label: "Property Address", type: "text", required: true, order: 1 },
  { id: "lotNo", label: "Lot No.", type: "text", required: true, order: 2 },
  { id: "projectDescription", label: "Project Description", type: "textarea", required: true, order: 3 },
  { id: "contractorName", label: "Contractor Name", type: "text", required: false, order: 4 },
  { id: "contractorNumber", label: "Contractor Number", type: "text", required: false, order: 5 },
  { id: "additionalDetails", label: "Additional Details", type: "textarea", required: false, order: 6 },
];

export const BASE_FIELD_IDS = new Set(baseProjectFields.map((f) => f.id));

const ADMIN_NAME = "Morgan Ellis";

type FieldSpec = [
  id: string,
  label: string,
  type: CategoryFieldType,
  required: boolean,
  helpText?: string,
];

function fields(specs: FieldSpec[]): CategoryField[] {
  return specs.map(([id, label, type, required, helpText], i) => ({
    id,
    label,
    type,
    required,
    helpText,
    order: i + 1,
  }));
}

function category(
  id: string,
  name: string,
  description: string,
  specs: FieldSpec[],
  createdDaysAgo: number,
  version = 1
): Category {
  const current = fields(specs);
  const createdAt = daysAgo(createdDaysAgo);
  const versions: CategoryVersion[] = [];
  for (let v = 1; v <= version; v++) {
    const isLatest = v === version;
    versions.push({
      version: v,
      name,
      description,
      // Earlier versions of the Generator form predate the sound-rating requirement.
      fields: isLatest ? current : current.filter((f) => f.id !== "soundRating"),
      createdAt: v === 1 ? createdAt : daysAgo(24),
      createdBy: ADMIN_NAME,
      changes: v === 1 ? ["Initial form"] : ["Added document “Sound rating certificate (dBA)” (required)"],
    });
  }
  return {
    id,
    name,
    description,
    status: "active",
    fields: current,
    currentVersion: version,
    version,
    versions,
    createdAt,
    updatedAt: daysAgo(version > 1 ? 24 : 60 + ((name.length * 17) % 150)),
  };
}

export const seedCategories: Category[] = [
  category(
    "new-dwelling",
    "New Dwelling",
    "Construction of a new single-family residence.",
    [
      ["builderName", "Builder / Architect of Record", "text", true, "Company or individual responsible for the plans."],
      ["squareFootage", "Approximate square footage", "text", true, "Under-air living area, in square feet."],
      ["architecturalPlans", "Architectural plans", "file", true, "Full plan set as a single PDF. Include floor plans and roof plan."],
      ["sitePlan", "Site plan / survey", "file", true, "Signed & sealed survey showing setbacks."],
      ["elevations", "Exterior elevations", "file", true, "All four elevations with materials called out."],
    ],
    380
  ),
  category(
    "addition-to-dwelling",
    "Addition to Dwelling",
    "Room additions, second-story additions, or garage conversions.",
    [
      ["additionType", "Type of addition", "text", true, "Room, second story, garage conversion, etc."],
      ["squareFootage", "Approximate square footage", "text", true],
      ["drawings", "Architectural drawings", "file", true, "Plans showing the existing home and proposed addition."],
      ["elevations", "Exterior elevations", "file", true],
      ["materialsSpec", "Materials & finishes specification", "file", false, "Roofing, siding, and paint to match the existing home."],
    ],
    380
  ),
  category(
    "demolition",
    "Demolition",
    "Full or partial demolition of a structure or outbuilding.",
    [
      ["demolitionScope", "Scope of demolition", "textarea", true, "Describe exactly what will be removed."],
      ["demolitionPermit", "Demolition permit", "file", true],
      ["sitePhotos", "Photos of existing structure", "file", true, "Clear photos from at least two angles."],
    ],
    380
  ),
  category(
    "windows-doors",
    "Windows/Doors",
    "Replacement or modification of exterior windows and doors.",
    [
      ["unitCount", "Number of units", "text", true],
      ["frameColor", "Frame color & finish", "text", true, "Include manufacturer color name."],
      ["productSpec", "Product specification sheet", "file", true, "Manufacturer spec sheet showing impact rating."],
      ["currentPhotos", "Photos of current windows/doors", "file", false],
    ],
    380
  ),
  category(
    "generator",
    "Generator",
    "Permanent standby generator installation.",
    [
      ["fuelType", "Fuel type", "text", true, "Natural gas, propane, or diesel."],
      ["kwRating", "Generator rating (kW)", "text", true],
      ["sitePlan", "Site plan with generator location", "file", true, "Show the pad location and distance to property lines."],
      ["specSheet", "Manufacturer specification sheet", "file", true],
      ["soundRating", "Sound rating certificate (dBA)", "file", true, "Manufacturer decibel rating at 23 ft. Added in form v2."],
    ],
    380,
    2
  ),
  category(
    "screen-enclosure",
    "Screen Enclosure",
    "Pool cages, lanai screen rooms, and patio enclosures.",
    [
      ["enclosureType", "Enclosure type", "text", true, "Pool cage, lanai, or patio room."],
      ["frameColor", "Frame color", "text", true],
      ["drawings", "Enclosure drawings", "file", true],
      ["sitePlan", "Site plan / survey", "file", true],
    ],
    380
  ),
  category(
    "pool-deck-driveway",
    "Pool Deck/Driveway Replacement",
    "Replacement or resurfacing of pool decks, driveways, and walkways.",
    [
      ["surfaceMaterial", "New surface material", "text", true, "Pavers, concrete, travertine, etc."],
      ["areaSize", "Approximate area (sq ft)", "text", true],
      ["materialSample", "Material sample or product sheet", "file", true],
      ["currentPhotos", "Photos of current surface", "file", false],
    ],
    380
  ),
  category(
    "hurricane-shutters",
    "Hurricane Shutters",
    "Accordion, roll-down, panel, and impact-rated shutter systems.",
    [
      ["shutterType", "Shutter type", "text", true, "Accordion, roll-down, panel, or impact glass."],
      ["shutterColor", "Shutter color", "text", true],
      ["productSpec", "Product specification & approval", "file", true, "Florida Product Approval document."],
      ["elevationPhotos", "Photos of installation locations", "file", true],
    ],
    380
  ),
  category(
    "pool-installation",
    "Pool Installation",
    "New pool, spa, or water-feature installation.",
    [
      ["poolDimensions", "Pool dimensions", "text", true, "Length × width × depth."],
      ["equipmentLocation", "Equipment pad location", "text", true],
      ["poolPlans", "Pool plans & engineering", "file", true],
      ["sitePlan", "Site plan / survey", "file", true],
      ["landscapeScreening", "Equipment screening plan", "file", false],
    ],
    380
  ),
  category(
    "roof-replacement",
    "Roof Replacement",
    "Re-roofing with a new material, color, or profile.",
    [
      ["roofMaterial", "Roofing material", "text", true, "Barrel tile, flat tile, shingle, or metal."],
      ["roofColor", "Roof color", "text", true, "Manufacturer color name and number."],
      ["productSample", "Product sample photo or spec", "file", true],
      ["currentPhotos", "Photos of current roof", "file", true],
    ],
    380
  ),
  category(
    "fence",
    "Fence",
    "New or replacement fencing, gates, and privacy walls.",
    [
      ["fenceMaterial", "Fence material", "text", true, "Aluminum, PVC, wood, or masonry."],
      ["fenceHeight", "Fence height", "text", true, "In feet. Front yards are limited to 4 ft."],
      ["surveyMarkup", "Survey with fence line marked", "file", true],
      ["materialSample", "Material / style sample", "file", false],
    ],
    380
  ),
  category(
    "paint-color-change",
    "Paint Color Change",
    "Exterior paint color changes for body, trim, doors, and accents.",
    [
      ["surfaces", "Surfaces to be painted", "text", true, "Body, trim, front door, garage door, etc."],
      ["colorName", "Color name & manufacturer", "text", true, "For example: Sherwin-Williams SW 7036."],
      ["colorSample", "Color sample / swatch photo", "file", true],
      ["currentPhotos", "Photos of current exterior", "file", true, "Front and side elevations in daylight."],
    ],
    380
  ),
  category(
    "landscaping",
    "Landscaping",
    "Landscape design changes, tree removal, and irrigation modifications.",
    [
      ["landscapeScope", "Scope of landscape changes", "textarea", true],
      ["plantList", "Plant list", "file", false, "Species, sizes, and quantities."],
      ["landscapePlan", "Landscape plan", "file", true],
    ],
    380
  ),
];
