import type { Metadata } from "next";
import Campaign from "@/components/game/Campaign";

export const metadata: Metadata = {
  title: "The campaign | Vitaliy Pikalo",
  description:
    "A short real-time strategy campaign through Vitaliy Pikalo's story: recruit a warband at each shrine, then win the resume from the Final Round.",
};

export default function PlayPage() {
  return <Campaign />;
}
