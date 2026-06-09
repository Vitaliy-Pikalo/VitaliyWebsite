"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const artists = [
  { name: "Gunna",         genre: "Trap / Melodic Rap"  },
  { name: "Don Toliver",   genre: "Psychedelic Trap"    },
  { name: "Travis Scott",  genre: "Astroworld Rap"      },
  { name: "Playboi Carti", genre: "Rage / Trap"         },
  { name: "Fisher",        genre: "Tech House"          },
  { name: "Chris Lake",    genre: "Deep / Tech House"   },
  { name: "John Summit",   genre: "Progressive House"   },
  { name: "Fred Again..",  genre: "UK Garage / House"   },
];

const genres = [
  "Tech House", "Melodic House", "Melodic Trap", "Rage Rap",
  "Psychedelic R&B", "UK Bass", "Afro House", "Lo-Fi Beats",
];

export default function MusicPage() {
  return (
    <div className="music-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>
        ← Back
      </Link>
      <CategoryHeroImage src="/categories/music.png" alt="Music" />
      <h1 className="skills-title" style={{ marginBottom: "40px" }}>Music</h1>

      <p className="music-section-title">Artists</p>
      <div className="artist-grid">
        {artists.map((a) => (
          <div key={a.name} className="artist-card">
            <div className="artist-name">{a.name}</div>
            <div className="artist-genre">{a.genre}</div>
          </div>
        ))}
      </div>

      <p className="music-section-title">Genres</p>
      <div className="genre-tag-row">
        {genres.map((g) => (
          <span key={g} className="genre-tag">{g}</span>
        ))}
      </div>

      <p className="music-section-title">Playlist</p>
      <div className="playlist-embed-wrap">
        <iframe
          width="100%"
          height="380"
          src="https://www.youtube.com/embed/videoseries?list=PL1JnANQpaEfhmORSFuLjZW_epMNL0P6qc"
          title="Music Playlist"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ borderRadius: "12px", display: "block" }}
        />
      </div>
      <p style={{ color: "#555", fontSize: "0.8rem", marginTop: "8px", marginBottom: "48px" }}>
        Best experienced with sound on.
      </p>
    </div>
  );
}
