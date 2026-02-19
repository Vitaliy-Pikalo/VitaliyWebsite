"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const profiles = [
  {
    name: "recruiter",
    image: "/profile/recruiter.png",
    backgroundGif: "https://i.giphy.com/media/16u7Ifl2T4zYfQ932F/giphy.gif",
  },
  {
    name: "developer",
    image: "/profile/developer.png",
    backgroundGif: "https://i.giphy.com/media/TFPdmm3rdzeZ0kP3zG/giphy.gif",
  },
  {
    name: "stalker",
    image: "/profile/stalker.png",
    backgroundGif: "https://i.giphy.com/media/QjZXUBUr89CkiWLPjL/giphy.gif",
  },
  {
    name: "adventurer",
    image: "/profile/adventurer.png",
    backgroundGif: "https://i.giphy.com/media/ERKMnDK6tkzJe8YVa3/giphy.gif",
  },
];

export default function Browse() {
  const router = useRouter();

  const handleProfileClick = (profile: (typeof profiles)[0]) => {
    router.push(`/profile/${profile.name}?gif=${encodeURIComponent(profile.backgroundGif)}`);
  };

  return (
    <div className="browse-container">
      <h1 className="who-is-watching">Who&apos;s Watching?</h1>
      <div className="profiles" style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "10rem" }}>
        {profiles.map((profile) => (
          <button
            key={profile.name}
            type="button"
            className="profile-card"
            onClick={() => handleProfileClick(profile)}
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
