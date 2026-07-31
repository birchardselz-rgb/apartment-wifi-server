import { ModulePage } from "../components/ModulePage";
export default function PropertiesPage() { return <ModulePage config={{ eyebrow: "PROPERTIES", title: "Property portfolio", description: "A complete view of buildings, rooms, and occupancy.", keys: ["buildings", "rooms", "properties"], columns: ["name", "address", "roomNumber", "status"] }} />; }
