"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const profiles = [
  { name: "recruiter",  image: "/profile/recruiter.png" },
  { name: "developer",  image: "/profile/developer.png" },
  { name: "stalker",    image: "/profile/stalker.png"   },
  { name: "adventurer", image: "/profile/adventurer.png"},
];

export default function Browse() {
  const router = useRouter();

  return (
    <div className="browse-container">
      <h1 className="who-is-watching">Who&apos;s Watching?</h1>
      <div className="profiles" style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "10rem" }}>
        {profiles.map((profile) => (
          <button
            key={profile.name}
            type="button"
            className="profile-card"
            onClick={() => router.push(`/profile/${profile.name}`)}
            style={{ background: "none", border: "none" }}
          >
            <div className="image-container">
              <Image
                src={profile.image}
                alt={profile.name}
                className="profile-image"
                width={200}
                height={200}
                priority
                unoptimized={false}
              />
            </div>
            <span className="profile-name">{profile.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
