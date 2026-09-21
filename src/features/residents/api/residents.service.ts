import { db, delay } from "@/lib/mock/store";
import { logActivity } from "@/lib/mock/activity";

export async function getResidents(): Promise<Resident[]> {
  return delay(db.getResidents(), 60);
}

export async function setResidentActive(id: string, active: boolean): Promise<Resident> {
  const residents = db.getResidents();
  const idx = residents.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Resident not found.");
  const next = [...residents];
  next[idx] = { ...next[idx], active };
  db.setResidents(next);
  const name = `${next[idx].firstName} ${next[idx].lastName}`;
  logActivity({
    category: "account",
    type: active ? "resident_activated" : "resident_deactivated",
    message: `${active ? "Activated" : "Deactivated"} resident account for ${name}.`,
    target: { kind: "resident", id, label: name },
  });
  return delay(next[idx], 140);
}
